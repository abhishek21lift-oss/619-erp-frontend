'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import {
  Brain, Loader2, Sparkles, AlertTriangle, CheckCircle2, ArrowUpCircle,
  Target, Quote, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AiFitnessTestAnalysis } from '@/lib/api';

const SEVERITY_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  low: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)', color: '#059669' },
  medium: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', color: '#d97706' },
  high: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', color: '#dc2626' },
};

interface AiRecommendationsPanelProps {
  assessmentId: string;
}

export function AiRecommendationsPanel({ assessmentId }: AiRecommendationsPanelProps) {
  const [analysis, setAnalysis] = useState<AiFitnessTestAnalysis | null>(null);
  const [meta, setMeta] = useState<{ model?: string; used_fallback?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.ai.analyzeFitnessTest(assessmentId);
      setAnalysis(res.data);
      setMeta({ model: res.model, used_fallback: res.used_fallback });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate AI recommendations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Brain size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">AI Recommendations</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">A sports-scientist read of this assessment.</p>
          </div>
        </div>

        {!analysis && !loading && (
          <button
            type="button" onClick={generate}
            className="flex items-center gap-2 rounded-[13px] px-5 py-3 text-[13px] font-[700] transition-all"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#fff' }}
          >
            <Sparkles size={15} /> Generate AI Recommendations
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-6">
            <Loader2 size={18} className="animate-spin" style={{ color: '#F59E0B' }} />
            <span className="text-[13px] font-[600] text-slate-500">Analysing assessment…</span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[13px] font-[640]" style={{ color: '#991b1b' }}>{error}</p>
              <button type="button" onClick={generate} className="mt-2 text-[12px] font-[700]" style={{ color: '#dc2626' }}>
                Try again
              </button>
            </div>
          </div>
        )}

        {analysis && (
          <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
            {meta?.model && (
              <span className="inline-block rounded-full px-2.5 py-1 text-[10.5px] font-[700]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-disabled)' }}>
                Analysed by {meta.model}{meta.used_fallback ? ' (fallback)' : ''}
              </span>
            )}

            <p className="text-[14px] leading-relaxed text-slate-700">{analysis.summary}</p>
            <p className="text-[13px] leading-relaxed text-slate-500">{analysis.overall_assessment}</p>

            {analysis.strengths.length > 0 && (
              <div>
                <p className="mb-2 text-[11.5px] font-[700] uppercase tracking-wider text-slate-400">Strengths</p>
                <ul className="space-y-1.5">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <CheckCircle2 size={14} style={{ color: '#059669', flexShrink: 0, marginTop: 2 }} /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.areas_to_improve.length > 0 && (
              <div>
                <p className="mb-2 text-[11.5px] font-[700] uppercase tracking-wider text-slate-400">Areas to Improve</p>
                <ul className="space-y-1.5">
                  {analysis.areas_to_improve.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-slate-700">
                      <ArrowUpCircle size={14} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.risk_flags.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11.5px] font-[700] uppercase tracking-wider text-slate-400">Risk Flags</p>
                {analysis.risk_flags.map((r, i) => {
                  const style = SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.medium;
                  return (
                    <div key={i} className="flex items-start gap-3 rounded-[14px] p-3.5" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                      <AlertTriangle size={16} style={{ color: style.color, flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <p className="text-[13px] font-[700]" style={{ color: style.color }}>{r.flag}</p>
                        <p className="text-[12px] text-slate-600 mt-0.5">{r.action}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {analysis.recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11.5px] font-[700] uppercase tracking-wider text-slate-400">Recommendations</p>
                {[...analysis.recommendations].sort((a, b) => a.priority - b.priority).map((r, i) => (
                  <div key={i} className="rounded-[14px] p-3.5" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-[800]" style={{ background: '#0f172a', color: '#F59E0B' }}>
                        {r.priority}
                      </span>
                      <p className="text-[13px] font-[700] text-slate-800">{r.focus_area}</p>
                    </div>
                    <p className="text-[12.5px] text-slate-600">{r.action}</p>
                    <p className="text-[11.5px] text-slate-400 mt-1 italic">{r.rationale}</p>
                  </div>
                ))}
              </div>
            )}

            {analysis.suggested_next_test_focus && (
              <div className="flex items-start gap-3 rounded-[14px] p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Target size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                <p className="text-[12.5px] font-[600] text-slate-700">{analysis.suggested_next_test_focus}</p>
              </div>
            )}

            {analysis.motivation_message && (
              <div className="rounded-[16px] p-5" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)' }}>
                <Quote size={16} color="#F59E0B" />
                <p className="mt-2 text-[13px] italic leading-relaxed text-white/80">{analysis.motivation_message}</p>
              </div>
            )}

            <button
              type="button" onClick={generate}
              className="flex items-center gap-1.5 text-[12px] font-[700]" style={{ color: '#94a3b8' }}
            >
              <RefreshCw size={12} /> Regenerate
            </button>
          </m.div>
        )}
      </div>
    </div>
  );
}

export default AiRecommendationsPanel;
