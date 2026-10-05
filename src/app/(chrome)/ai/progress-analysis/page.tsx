'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp, Loader2, Sparkles, AlertTriangle, AlertCircle, CheckCircle2,
  User, TrendingDown, Minus, Target, Brain, ChevronRight, RefreshCw, X,
} from 'lucide-react';
import { m, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type { AiProgressAnalysis, AiProgressDataCounts, AiWeightPoint } from '@/lib/api';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { PremiumLineChart } from '@/components/visualizations';
import { errorMessage } from '@/lib/forms/errors';

const ACCENT = '#FBBF24';
const ACCENT_DIM = 'rgba(251,191,36,0.12)';
const ACCENT_GLOW = 'rgba(251,191,36,0.25)';

interface Client { id: number; name: string; email?: string; }

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

function TrendBadge({ direction }: { direction: string }) {
  const up = direction === 'up' || direction === 'improving';
  const down = direction === 'down' || direction === 'declining';
  if (up) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981' }}>
      <TrendingUp size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Up</span>
    </div>
  );
  if (down) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}>
      <TrendingDown size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Down</span>
    </div>
  );
  // Unknown is "no data", never "Stable" — absence of a reading must not
  // render as a flat trend.
  if (direction === 'stable' || direction === 'flat') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-disabled)' }}>
      <Minus size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stable</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-disabled)' }}>
      <Minus size={15} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>No data</span>
    </div>
  );
}

/**
 * AI progress analysis, optionally pre-selected from the link that opened it.
 *
 * ── Why the search param is read at all ────────────────────────────────────
 *
 * The member profile's AI tab links here as `?client_id=<id>`. This page had
 * no useSearchParams at all — `selectedClient` started null and was only ever
 * set by the search dropdown — so a trainer who tapped "AI progress analysis"
 * on a client's profile landed on a page that asked them which client they
 * meant. The link navigated; it just dropped the context that made it useful.
 */
function ProgressAnalysisInner() {
  const sp = useSearchParams();
  const linkedClientId = sp.get('client_id');

  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiProgressAnalysis | null>(null);
  const [counts, setCounts] = useState<AiProgressDataCounts | null>(null);
  const [weights, setWeights] = useState<AiWeightPoint[]>([]);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Debounced search with a sequence guard. The old effect fired per
  // keystroke with no abort — typing "ann" could render "a"'s results last.
  const searchSeq = useRef(0);
  useEffect(() => {
    const id = setTimeout(() => {
      const seq = ++searchSeq.current;
      const load = clientSearch ? api.clients.search(clientSearch) : api.clients.list({ limit: 20 });
      load.then((data) => {
        if (searchSeq.current === seq) setClients(data as unknown as Client[]);
      }).catch(() => {});
    }, clientSearch ? 300 : 0);
    return () => clearTimeout(id);
  }, [clientSearch]);

  // Resolve the linked client by id.
  //
  // Fetched directly rather than searched for in the list above: that list is
  // the first 20 clients, so a studio with more than twenty would silently
  // fail to find anyone past the twentieth — the bug would look like "the link
  // works for some clients and not others", which is the worst kind to report.
  //
  // Runs once per id. Guarded on selectedClient so it cannot fight a trainer
  // who has since picked somebody else from the dropdown.
  useEffect(() => {
    if (!linkedClientId) return;
    let cancelled = false;
    api.pt.client(linkedClientId)
      .then((res) => {
        const c = (res as { data?: Client | null })?.data;
        if (!cancelled && c) {
          setSelectedClient((current) => current ?? c);
        }
      })
      .catch(() => {
        // A bad or inaccessible id leaves the picker as it was, which is the
        // page working normally rather than an error about a link.
      });
    return () => { cancelled = true; };
  }, [linkedClientId]);

  const handleAnalyze = async () => {
    if (!selectedClient) { setError('Please select a client first.'); return; }
    setError(''); setLoading(true);
    // A re-run keeps the previous analysis on screen while loading.
    try {
      const res = await api.ai.analyzeProgress(String(selectedClient.id));
      setAnalysis(res.data);
      setCounts(res.data_counts ?? null);
      setWeights(res.weight_history ?? []);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
      setUpdatedAt(new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }));
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to analyse progress.'));
    } finally { setLoading(false); }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const thinData = counts !== null &&
    counts.assessments === 0 && counts.checkins === 0 &&
    counts.strength_logs === 0 && counts.goals === 0;

  const rate = analysis?.attendance_trend?.rate_pct;

  return (
    <Guard>
      <PageContainer>

        <PageHero
          icon={<TrendingUp size={20} />}
          title="AI Progress Analyzer"
          subtitle="Deep dive into a client's fitness journey with AI-powered insights and strategy"
        >
          <div className="flex flex-wrap gap-2">
            {['Weight Trends', 'Strength Analysis', 'Attendance Tracking', 'Risk Detection', 'Monthly Strategy'].map((p) => (
              <span key={p} className="rounded-full px-3 py-1.5 text-[12px] font-[550] text-white"
                style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {p}
              </span>
            ))}
          </div>
        </PageHero>

      <div className="mx-auto w-full max-w-4xl">

        {/* Client selector */}
        <m.div variants={fadeUp} initial="hidden" animate="show" custom={1}
          className="mb-8 rounded-[24px] border border-gray-200 bg-white p-5 sm:p-7"
          style={{ boxShadow: 'var(--shadow-xs)' }}>
          <div className="mb-6 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: ACCENT_DIM }}>
              <User size={16} color={ACCENT} />
            </div>
            <span className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Select Client</span>
          </div>

          <div className="relative">
            <div className="relative">
              <User size={16} color="#94a3b8" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input aria-label="Search clients by name"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls="pa-client-list"
                aria-autocomplete="list"
                type="text"
                className="h-[52px] w-full rounded-[15px] py-2.5 pl-12 pr-10 text-[15px] font-[500] outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                placeholder="Search clients by name…"
                value={selectedClient ? selectedClient.name : clientSearch}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setShowDropdown(true); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setShowDropdown(false); }}
              />
              {selectedClient && (
                <button
                  type="button"
                  aria-label="Clear selected client"
                  onClick={() => { setSelectedClient(null); setClientSearch(''); setShowDropdown(true); }}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {showDropdown && filteredClients.length > 0 && (
              <div id="pa-client-list" role="listbox" aria-label="Matching clients" style={{
                position: 'absolute', zIndex: 20, width: '100%', marginTop: 4,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 14, boxShadow: 'var(--shadow-card)',
                maxHeight: 220, overflowY: 'auto', overscrollBehavior: 'contain',
              }}>
                {filteredClients.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={selectedClient?.id === c.id}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 16px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      borderBottom: i < filteredClients.length - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                    // onClick, not onMouseDown: keyboard Enter/Space on a
                    // focused button fires click, never mousedown — the old
                    // handler made every option inert for keyboard users.
                    onClick={() => { setSelectedClient(c); setClientSearch(c.name); setShowDropdown(false); }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      {c.email && <div style={{ fontSize: 12, color: 'var(--text-disabled)', marginTop: 2 }}>{c.email}</div>}
                    </div>
                    <ChevronRight size={14} color="#94a3b8" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2 rounded-[10px] px-3.5 py-2.5 text-[13px] font-medium"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                onClick={handleAnalyze}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 font-semibold hover:bg-red-100"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          )}

          <div className="mt-5">
            <button
              onClick={handleAnalyze}
              disabled={loading || !selectedClient}
              className="flex items-center gap-2 rounded-xl px-7 py-3 text-[14px] font-bold transition-all"
              style={{
                background: !selectedClient || loading ? 'rgba(251,191,36,0.3)' : `linear-gradient(135deg, ${ACCENT}, #F59E0B)`,
                color: 'var(--text-primary)', border: 'none',
                cursor: !selectedClient || loading ? 'not-allowed' : 'pointer',
                boxShadow: selectedClient && !loading ? `0 4px 20px ${ACCENT_GLOW}` : 'none',
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Analysing…' : analysis ? 'Re-analyse Progress' : 'Analyse Progress'}
            </button>
          </div>
        </m.div>

        {/* Loading — only when there is nothing to show yet */}
        {loading && !analysis && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-14">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px]"
              style={{ background: ACCENT_DIM, border: '1px solid rgba(251,191,36,0.2)' }}>
              <Loader2 size={28} color={ACCENT} className="animate-spin" />
            </div>
            <div className="text-center">
              <div className="text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>Analysing progress data…</div>
              <div className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>AI is reviewing workouts, nutrition, and attendance patterns</div>
            </div>
          </m.div>
        )}

        {/* Results */}
        {analysis && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              {meta && (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={0}
                  className="flex w-fit items-center gap-2 rounded-[20px] px-3.5 py-2"
                  style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Sparkles size={13} color="#F59E0B" />
                  <span className="text-[12px] font-semibold" style={{ color: '#F59E0B' }}>Analysed by {meta.model}</span>
                  {meta.used_fallback && <span className="ml-1 text-[11px]" style={{ color: '#D97706' }}>(fallback)</span>}
                </m.div>
              )}
              {updatedAt && (
                <span className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>Updated {updatedAt}</span>
              )}
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {/* Provenance: what the reading rests on */}
            {counts && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[16px] border border-gray-200 bg-white px-4 py-3 text-[12px]"
                style={{ boxShadow: 'var(--shadow-xs)', color: 'var(--text-secondary)' }}>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Based on</span>
                <span>{counts.assessments} assessments</span>
                <span>·</span>
                <span>{counts.checkins} check-ins</span>
                <span>·</span>
                <span>{counts.strength_logs} strength logs</span>
                {thinData && (
                  <span className="font-semibold text-amber-700">— almost no records on file; treat the reading below as a starting template, not a verdict.</span>
                )}
              </div>
            )}

            {/* AI-estimate disclaimer */}
            <div className="flex items-start gap-2 rounded-[16px] border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The reading below is an <strong>AI-generated estimate</strong> from the
                records above — direction and judgement, not measured fact. Figures the
                model states (attendance %, weight deltas) are its arithmetic, not
                computed metrics. Verify before acting on them.
              </span>
            </div>

            {/* Summary */}
            {analysis.summary && (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={1}
                className="rounded-[20px] p-6"
                style={{ background: '#FFFBEB', border: '1px solid rgba(251,191,36,0.25)' }}>
                <div className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: ACCENT }}>AI Summary</div>
                <p className="m-0 text-[15px] leading-[1.7]" style={{ color: 'var(--text-primary)' }}>{analysis.summary}</p>
                {analysis.period_analysed && (
                  <div className="mt-3 text-[12px]" style={{ color: 'var(--text-disabled)' }}>
                    Period analysed: <strong style={{ color: 'var(--text-secondary)' }}>{analysis.period_analysed}</strong>
                  </div>
                )}
              </m.div>
            )}

            {/* Weight history — verified assessment readings */}
            <PremiumLineChart
              data={weights.map((w) => ({ date: w.date, weight: w.weight_kg }))}
              xKey="date"
              lines={[{ key: 'weight', label: 'Weight (kg)' }]}
              title="Weight history"
              subtitle="Verified assessment readings, oldest → newest"
              formatValue={(v) => `${v} kg`}
              emptyTitle="No weight readings yet"
              emptyDescription="Log an assessment with a weight to start the trend."
            />

            {/* Trend cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {analysis.weight_trend && (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={2}
                  className="rounded-[16px] border border-gray-200 bg-white p-5"
                  style={{ boxShadow: 'var(--shadow-xs)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-disabled)' }}>Weight</span>
                    <TrendBadge direction={analysis.weight_trend.direction} />
                  </div>
                  {typeof analysis.weight_trend.change_kg === 'number' && Number.isFinite(analysis.weight_trend.change_kg) ? (
                    <div className="mb-1.5 text-[28px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
                      {analysis.weight_trend.change_kg > 0 ? '+' : ''}{analysis.weight_trend.change_kg}
                      <span className="ml-1 text-[14px] font-medium" style={{ color: 'var(--text-disabled)' }}>kg</span>
                    </div>
                  ) : null}
                  <p className="m-0 text-[12px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>{analysis.weight_trend.insight}</p>
                  <p className="m-0 mt-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>AI estimate</p>
                </m.div>
              )}
              {analysis.strength_trend && (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={3}
                  className="rounded-[16px] border border-gray-200 bg-white p-5"
                  style={{ boxShadow: 'var(--shadow-xs)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-disabled)' }}>Strength</span>
                    <TrendBadge direction={analysis.strength_trend.direction} />
                  </div>
                  <div className="mb-1.5 text-[16px] font-bold" style={{ color: 'var(--text-primary)' }}>{analysis.strength_trend.highlight}</div>
                  <p className="m-0 text-[12px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>{analysis.strength_trend.insight}</p>
                </m.div>
              )}
              {analysis.attendance_trend && (
                <m.div variants={fadeUp} initial="hidden" animate="show" custom={4}
                  className="rounded-[16px] border border-gray-200 bg-white p-5"
                  style={{ boxShadow: 'var(--shadow-xs)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--text-disabled)' }}>Attendance</span>
                    <TrendBadge direction={(analysis.attendance_trend as { direction?: string }).direction ?? ''} />
                  </div>
                  <div className="mb-1.5 text-[28px] font-extrabold" style={{ color: 'var(--text-primary)' }}>
                    {typeof rate === 'number' && Number.isFinite(rate) ? rate : '—'}
                    <span className="ml-0.5 text-[14px] font-medium" style={{ color: 'var(--text-disabled)' }}>%</span>
                  </div>
                  <p className="m-0 text-[12px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>{analysis.attendance_trend.insight}</p>
                  <p className="m-0 mt-1.5 text-[11px]" style={{ color: 'var(--text-disabled)' }}>AI estimate</p>
                </m.div>
              )}
            </div>

            {/* Wins */}
            {analysis.wins?.length ? (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={5}
                className="rounded-[20px] px-6 py-5"
                style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <div className="mb-3.5 flex items-center gap-2">
                  <CheckCircle2 size={18} color="#10b981" />
                  <span className="text-[14px] font-bold" style={{ color: '#059669' }}>Wins &amp; Achievements</span>
                </div>
                <div className="flex flex-col gap-2">
                  {analysis.wins.map((w, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#10b981' }} />
                      <span className="text-[14px] leading-[1.5]" style={{ color: '#059669' }}>{w}</span>
                    </div>
                  ))}
                </div>
              </m.div>
            ) : null}

            {/* Risks */}
            {analysis.risks?.length ? (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={6}
                className="overflow-hidden rounded-[20px]"
                style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
                  <AlertTriangle size={18} color={ACCENT} />
                  <span className="text-[14px] font-bold" style={{ color: ACCENT }}>Risk Factors</span>
                </div>
                {analysis.risks.map((r, i) => (
                  <div key={i} style={{
                    padding: '16px 24px',
                    borderBottom: i < analysis.risks!.length - 1 ? '1px solid rgba(251,191,36,0.1)' : 'none',
                  }}>
                    <div className="mb-1.5 flex items-center gap-2.5">
                      <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.risk}</span>
                      {r.severity && (
                        <span className="rounded-[20px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]"
                          style={{
                            background: r.severity === 'high' ? 'rgba(239,68,68,0.1)' : r.severity === 'medium' ? 'rgba(251,191,36,0.15)' : '#F1F5F9',
                            color: r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? ACCENT : '#64748b',
                          }}>{r.severity}</span>
                      )}
                    </div>
                    {r.action && <p className="m-0 text-[13px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>{r.action}</p>}
                  </div>
                ))}
              </m.div>
            ) : null}

            {/* Recommendations */}
            {analysis.recommendations?.length ? (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={7}
                className="overflow-hidden rounded-[20px] border border-gray-200 bg-white"
                style={{ boxShadow: 'var(--shadow-xs)' }}>
                <div className="flex items-center gap-2 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <Target size={18} color={ACCENT} />
                  <span className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>Recommendations</span>
                </div>
                {analysis.recommendations
                  .slice()
                  .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
                  .map((r, i) => (
                  <div key={i} className="flex items-start gap-3.5 px-6 py-3.5"
                    style={{ borderBottom: i < analysis.recommendations!.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold"
                      style={{ background: ACCENT_DIM, color: ACCENT }}>
                      {r.priority ?? '–'}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{r.action}</div>
                      {r.rationale && <div className="mt-1 text-[12px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>{r.rationale}</div>}
                    </div>
                  </div>
                ))}
              </m.div>
            ) : null}

            {/* Next month strategy */}
            {analysis.next_month_strategy && (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={8}
                className="flex gap-3.5 rounded-[16px] border border-gray-200 bg-white px-6 py-5"
                style={{ boxShadow: 'var(--shadow-xs)' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: ACCENT_DIM }}>
                  <Brain size={18} color={ACCENT} />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: ACCENT }}>Next Month Strategy</div>
                  <p className="m-0 text-[14px] leading-[1.6]" style={{ color: 'var(--text-secondary)' }}>{analysis.next_month_strategy}</p>
                </div>
              </m.div>
            )}

            {/* Motivation */}
            {analysis.motivation_message && (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={9}
                className="rounded-[16px] px-6 py-5 text-center"
                style={{ background: ACCENT_DIM, border: '1px solid rgba(251,191,36,0.2)' }}>
                <p className="m-0 text-[15px] font-medium italic leading-[1.7]" style={{ color: ACCENT }}>
                  &ldquo;{analysis.motivation_message}&rdquo;
                </p>
              </m.div>
            )}
          </div>
        )}
      </div>
      </PageContainer>
    </Guard>
  );
}

/** useSearchParams suspends, so the page export wraps the real component. */
export default function ProgressAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <ProgressAnalysisInner />
    </Suspense>
  );
}
