'use client';

import { ArrowDown, ArrowUp, Minus, GitCompare } from 'lucide-react';

interface PostureComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

function issueCount(row: Record<string, unknown>): number {
  const front = Array.isArray(row.front_issues) ? row.front_issues as string[] : [];
  const side = Array.isArray(row.side_issues) ? row.side_issues as string[] : [];
  const back = Array.isArray(row.back_issues) ? row.back_issues as string[] : [];
  return new Set([...front, ...side, ...back]).size;
}

export function PostureComparison({ initial, latest }: PostureComparisonProps) {
  const scoreA = typeof initial.posture_risk_score === 'number' ? initial.posture_risk_score : null;
  const scoreB = typeof latest.posture_risk_score === 'number' ? latest.posture_risk_score : null;
  const scoreDelta = scoreA != null && scoreB != null ? scoreB - scoreA : null;
  const scoreImproved = scoreDelta != null && scoreDelta !== 0 ? scoreDelta > 0 : null;

  const countA = issueCount(initial);
  const countB = issueCount(latest);
  const countDelta = countB - countA;
  const countImproved = countDelta !== 0 ? countDelta < 0 : null;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <GitCompare size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Postural Improvement</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">
              Initial ({String(initial.assessment_date ?? '—')}) vs. Latest ({String(latest.assessment_date ?? '—')})
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: 'Posture Risk Score', a: scoreA, b: scoreB, delta: scoreDelta, improved: scoreImproved },
            { label: 'Distinct Issues Flagged', a: countA, b: countB, delta: countDelta, improved: countImproved },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
              <span className="text-[13px] font-[640] text-slate-600">{m.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-[12.5px] font-[600] text-slate-400">
                  {m.a ?? '—'} <span className="mx-1">→</span> {m.b ?? '—'}
                </span>
                {m.delta != null && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-[700]"
                    style={{
                      background: m.improved == null ? 'rgba(148,163,184,0.14)' : m.improved ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: m.improved == null ? '#64748b' : m.improved ? '#059669' : '#dc2626',
                    }}
                  >
                    {m.delta === 0 ? <Minus size={11} /> : m.delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                    {m.delta > 0 ? '+' : ''}{m.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PostureComparison;
