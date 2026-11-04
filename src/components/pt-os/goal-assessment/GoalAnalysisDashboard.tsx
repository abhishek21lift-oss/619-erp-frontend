'use client';

import { Gauge, AlertTriangle, Calendar } from 'lucide-react';
import GoalStepCard from './GoalStepCard';
import { gray, indigo, tint } from '@/lib/palette';
import type { GoalDifficulty, GoalMetric } from '@/lib/goal-calculations';

const DIFFICULTY_STYLE: Record<GoalDifficulty, { bg: string; color: string }> = {
  Easy: { bg: 'rgba(16,185,129,0.12)', color: '#047857' },
  Moderate: { bg: 'rgba(245,158,11,0.14)', color: '#b45309' },
  Hard: { bg: 'rgba(245,158,11,0.18)', color: '#b45309' },
  'Very Hard': { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c' },
};

interface GoalAnalysisDashboardProps {
  difficulty: GoalDifficulty | null;
  estimatedDurationWeeks: number | null;
  recommendedPtDurationMonths: number | null;
  requiredWeeklyRate: number | null;
  safeWeeklyRate: number | null;
  riskFactors: string[];
  metric: GoalMetric | null;
  /** Unit for the required/safe rate line; a lift may be in lb or kg. */
  rateUnit?: string;
}

function todayPlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function GoalAnalysisDashboard({
  difficulty, estimatedDurationWeeks, recommendedPtDurationMonths, requiredWeeklyRate, safeWeeklyRate, riskFactors, metric, rateUnit = 'kg/wk',
}: GoalAnalysisDashboardProps) {
  const ratio = requiredWeeklyRate != null && safeWeeklyRate ? Math.abs(requiredWeeklyRate) / safeWeeklyRate : null;
  const unrealistic = ratio != null && ratio > 1.5;
  const suggestedDate = unrealistic && estimatedDurationWeeks ? todayPlusDays(estimatedDurationWeeks * 7) : null;
  const style = difficulty ? DIFFICULTY_STYLE[difficulty] : null;
  const rateBased = metric != null && metric !== 'sessions' && metric !== 'custom';

  const stats = [
    { label: 'Estimated duration', value: estimatedDurationWeeks != null ? `${estimatedDurationWeeks} wks` : '—' },
    { label: 'Recommended PT', value: recommendedPtDurationMonths != null ? `${recommendedPtDurationMonths} months` : '—' },
    {
      label: rateBased ? 'Required / safe rate' : 'Rate',
      value: !rateBased
        ? 'Not rate-based'
        : `${requiredWeeklyRate != null ? `${Math.abs(requiredWeeklyRate)} ${rateUnit}` : '—'}${safeWeeklyRate != null ? ` / ${safeWeeklyRate} ${rateUnit}` : ''}`,
    },
  ];

  return (
    <GoalStepCard
      icon={Gauge} title="Goal Analysis" hint="a realistic read on this plan, not just what was asked for"
      badge={difficulty && style ? (
        <span className="rounded-full px-3 py-1.5 text-[11.5px] font-[760]" style={{ background: style.bg, color: style.color }}>
          {difficulty}
        </span>
      ) : undefined}
    >
      {unrealistic && (
        <div className="mb-5 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
          <AlertTriangle size={18} style={{ color: '#b91c1c', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p className="text-[13px] font-[700]" style={{ color: gray[900] }}>Target may not be safely achievable within the selected timeline.</p>
            {suggestedDate && (
              <p className="mt-1 flex items-center gap-1.5 text-[12px]" style={{ color: gray[600] }}>
                <Calendar size={12} /> A healthier target date would be around <strong style={{ color: gray[900] }}>{suggestedDate}</strong>.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {stats.map((row) => (
          <div key={row.label} className="rounded-[14px] px-4 py-3.5" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
            <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>{row.label}</p>
            <p className="mt-1 text-[15px] font-[800] tracking-[-0.01em]" style={{ color: gray[900] }}>{row.value}</p>
          </div>
        ))}
      </div>

      {riskFactors.length > 0 && (
        <div className="mt-5 rounded-[16px] p-4" style={{ background: tint(indigo[500], 0.04), border: `1px solid ${tint(indigo[500], 0.14)}` }}>
          <p className="mb-2 text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: indigo[700] }}>Risk factors</p>
          <ul className="space-y-1.5">
            {riskFactors.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[12.5px]" style={{ color: gray[700] }}>
                <AlertTriangle size={13} style={{ color: '#b45309', flexShrink: 0, marginTop: 2 }} /> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </GoalStepCard>
  );
}

export default GoalAnalysisDashboard;
