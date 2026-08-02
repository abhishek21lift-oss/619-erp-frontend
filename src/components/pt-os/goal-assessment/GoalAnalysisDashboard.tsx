'use client';

import { Gauge, AlertTriangle, Calendar } from 'lucide-react';
import type { GoalDifficulty } from '@/lib/goal-calculations';

const DIFFICULTY_STYLE: Record<GoalDifficulty, { bg: string; color: string }> = {
  Easy: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  Moderate: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
  Hard: { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b' },
  'Very Hard': { bg: 'rgba(239,68,68,0.18)', color: '#ef4444' },
};

interface GoalAnalysisDashboardProps {
  difficulty: GoalDifficulty | null;
  estimatedDurationWeeks: number | null;
  recommendedPtDurationMonths: number | null;
  requiredWeeklyRate: number | null;
  safeWeeklyRate: number | null;
  riskFactors: string[];
}

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function GoalAnalysisDashboard({
  difficulty, estimatedDurationWeeks, recommendedPtDurationMonths, requiredWeeklyRate, safeWeeklyRate, riskFactors,
}: GoalAnalysisDashboardProps) {
  const ratio = requiredWeeklyRate != null && safeWeeklyRate ? Math.abs(requiredWeeklyRate) / safeWeeklyRate : null;
  const unrealistic = ratio != null && ratio > 1.5;
  const suggestedDate = unrealistic && estimatedDurationWeeks ? todayPlusDays(estimatedDurationWeeks * 7) : null;
  const style = difficulty ? DIFFICULTY_STYLE[difficulty] : null;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}>
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(0,103,224,0.15)' }}>
            <Gauge size={20} color="#0067E0" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-white leading-none">Smart Goal Analysis</h2>
            <p className="text-[13px] text-white/40 mt-1.5">A realistic read on this plan, not just what was asked for.</p>
          </div>
        </div>

        {unrealistic && (
          <div className="mb-6 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertTriangle size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[13px] font-[700] text-white">Target may not be safely achievable within the selected timeline.</p>
              {suggestedDate && (
                <p className="mt-1 text-[12px] text-white/60 flex items-center gap-1.5">
                  <Calendar size={12} /> A healthier target date would be around <strong className="text-white">{suggestedDate}</strong>.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-[14px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider text-white/40">Difficulty</p>
            {difficulty && style ? (
              <span className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-[13px] font-[800]" style={{ background: style.bg, color: style.color }}>
                {difficulty}
              </span>
            ) : <p className="mt-1.5 text-[13px] text-white/40">Not applicable</p>}
          </div>
          <div className="rounded-[14px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider text-white/40">Est. Duration</p>
            <p className="mt-1.5 text-[18px] font-[800] text-white">{estimatedDurationWeeks != null ? `${estimatedDurationWeeks} wks` : '—'}</p>
          </div>
          <div className="rounded-[14px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider text-white/40">Recommended PT</p>
            <p className="mt-1.5 text-[18px] font-[800] text-white">{recommendedPtDurationMonths != null ? `${recommendedPtDurationMonths} mo` : '—'}</p>
          </div>
          <div className="rounded-[14px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[10.5px] font-[700] uppercase tracking-wider text-white/40">Required vs Safe Rate</p>
            <p className="mt-1.5 text-[15px] font-[800] text-white">
              {requiredWeeklyRate != null ? `${Math.abs(requiredWeeklyRate)} kg/wk` : '—'}
              <span className="text-white/40 font-[500]"> / {safeWeeklyRate != null ? `${safeWeeklyRate} kg/wk` : '—'}</span>
            </p>
          </div>
        </div>

        {riskFactors.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-[700] uppercase tracking-wider text-white/40">Risk Factors</p>
            <ul className="space-y-1.5">
              {riskFactors.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/70">
                  <AlertTriangle size={13} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default GoalAnalysisDashboard;
