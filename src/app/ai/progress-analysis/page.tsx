'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Loader2, Sparkles, AlertTriangle, CheckCircle2, User, TrendingDown, Minus } from 'lucide-react';
import { api } from '@/lib/api';
import type { AiProgressAnalysis } from '@/lib/api';

interface Client {
  id: number;
  name: string;
  email?: string;
}

function TrendBadge({ direction }: { direction: string }) {
  if (direction === 'up' || direction === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (direction === 'down' || direction === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export default function ProgressAnalysisPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiProgressAnalysis | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = clientSearch
      ? api.clients.search(clientSearch)
      : api.clients.list({ limit: 20 });
    load.then((data) => setClients(data as unknown as Client[])).catch(() => {});
  }, [clientSearch]);

  const handleAnalyze = async () => {
    if (!selectedClient) {
      setError('Please select a client first.');
      return;
    }
    setError('');
    setLoading(true);
    setAnalysis(null);
    setMeta(null);
    try {
      const res = await api.ai.analyzeProgress(String(selectedClient.id));
      setAnalysis(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to analyse progress.');
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-blue-500/10">
          <TrendingUp className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Progress Analyzer</h1>
          <p className="text-muted-foreground text-sm">Deep analysis of a client&apos;s fitness journey with personalised recommendations</p>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
        <div className="space-y-1 relative">
          <label className="text-sm font-medium text-foreground">Select Client</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Search by name…"
              value={selectedClient ? selectedClient.name : clientSearch}
              onFocus={() => {
                setShowDropdown(true);
                if (selectedClient) { setClientSearch(''); setSelectedClient(null); }
              }}
              onChange={(e) => { setClientSearch(e.target.value); setSelectedClient(null); setShowDropdown(true); }}
            />
          </div>
          {showDropdown && filteredClients.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors first:rounded-t-xl last:rounded-b-xl"
                  onMouseDown={() => { setSelectedClient(c); setClientSearch(c.name); setShowDropdown(false); }}
                >
                  <div className="font-medium">{c.name}</div>
                  {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}

        <button
          onClick={handleAnalyze}
          disabled={loading || !selectedClient}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Analysing…' : 'Analyse Progress'}
        </button>
      </div>

      {analysis && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {meta && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Analysed by <code className="bg-muted px-1 rounded">{meta.model}</code></span>
              {meta.used_fallback && <span className="text-yellow-600">(fallback model)</span>}
            </div>
          )}

          <div className="p-5 rounded-2xl border border-border bg-card">
            <h2 className="text-lg font-bold text-foreground">Summary</h2>
            <p className="text-sm text-muted-foreground mt-2">{analysis.summary}</p>
            {analysis.period_analysed && (
              <div className="mt-3 text-xs text-muted-foreground">Period: <strong className="text-foreground">{analysis.period_analysed}</strong></div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysis.weight_trend && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Weight Trend</span>
                  <TrendBadge direction={analysis.weight_trend.direction} />
                </div>
                {analysis.weight_trend.change_kg !== undefined && (
                  <div className="text-xl font-bold text-foreground">{analysis.weight_trend.change_kg > 0 ? '+' : ''}{analysis.weight_trend.change_kg} kg</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{analysis.weight_trend.insight}</p>
              </div>
            )}
            {analysis.strength_trend && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Strength Trend</span>
                  <TrendBadge direction={analysis.strength_trend.direction} />
                </div>
                <div className="text-sm font-semibold text-foreground">{analysis.strength_trend.highlight}</div>
                <p className="text-xs text-muted-foreground mt-1">{analysis.strength_trend.insight}</p>
              </div>
            )}
            {analysis.attendance_trend && (
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Attendance</span>
                </div>
                <div className="text-xl font-bold text-foreground">{analysis.attendance_trend.rate_pct}%</div>
                <p className="text-xs text-muted-foreground mt-1">{analysis.attendance_trend.insight}</p>
              </div>
            )}
          </div>

          {analysis.wins?.length ? (
            <div className="p-5 rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                Wins & Achievements
              </div>
              <ul className="space-y-1">
                {analysis.wins.map((w, i) => (
                  <li key={i} className="text-sm text-green-800 dark:text-green-300 flex gap-2">
                    <span className="shrink-0">•</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {analysis.risks?.length ? (
            <div className="p-5 rounded-2xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="w-4 h-4" />
                Risk Factors
              </div>
              {analysis.risks.map((r, i) => (
                <div key={i} className="border-b border-yellow-200 dark:border-yellow-900 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{r.risk}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${r.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : r.severity === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-muted text-muted-foreground'}`}>
                      {r.severity}
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">{r.action}</p>
                </div>
              ))}
            </div>
          ) : null}

          {analysis.recommendations?.length ? (
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="font-semibold text-foreground">Recommendations</h3>
              {analysis.recommendations
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((r, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/20">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{r.priority}</div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{r.action}</div>
                    {r.rationale && <div className="text-xs text-muted-foreground mt-0.5">{r.rationale}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {analysis.next_month_strategy && (
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="text-sm font-medium text-foreground mb-1">Next Month Strategy</div>
              <p className="text-sm text-muted-foreground">{analysis.next_month_strategy}</p>
            </div>
          )}

          {analysis.motivation_message && (
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
              <p className="text-sm text-foreground italic">&ldquo;{analysis.motivation_message}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
