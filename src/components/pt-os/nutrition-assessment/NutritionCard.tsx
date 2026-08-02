'use client';

import { ChevronRight, AlertTriangle } from 'lucide-react';
import { DonutChart } from '@/components/ui';

const READINESS_STYLE: Record<string, { bg: string; color: string }> = {
  Excellent: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  Good: { bg: 'rgba(245,158,11,0.15)', color: '#d97706' },
  Average: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  'Needs Improvement': { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  'High Risk': { bg: 'rgba(220,38,38,0.18)', color: '#dc2626' },
};

interface NutritionCardProps {
  assessment: Record<string, unknown>;
  onClick: () => void;
}

export function NutritionCard({ assessment, onClick }: NutritionCardProps) {
  const score = typeof assessment.nutrition_score === 'number' ? assessment.nutrition_score : null;
  const readiness = assessment.nutrition_readiness ? String(assessment.nutrition_readiness) : null;
  const style = readiness ? READINESS_STYLE[readiness] : null;
  const date = assessment.assessment_date ? String(assessment.assessment_date).slice(0, 10) : '—';
  const riskCount = Array.isArray(assessment.risk_factors) ? assessment.risk_factors.length : 0;

  return (
    <button
      type="button" onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[20px] p-5 text-left transition-all hover:scale-[1.01]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}
    >
      <div className="flex-shrink-0" style={{ width: 64 }}>
        <DonutChart
          data={[
            { name: 'Score', value: score ?? 0, color: '#F59E0B' },
            { name: 'Remaining', value: 100 - (score ?? 0), color: '#f1f5f9' },
          ]}
          centerValue={<span style={{ fontSize: 13 }}>{score ?? '—'}</span>}
          hideLegend thin height={64}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-[760] text-slate-900">{date}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {readiness && style && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: style.bg, color: style.color }}>
              {readiness}
            </span>
          )}
          {riskCount > 0 && (
            <span className="flex items-center gap-1 text-[11.5px] font-[600]" style={{ color: '#dc2626' }}>
              <AlertTriangle size={11} /> {riskCount} risk{riskCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
    </button>
  );
}

export default NutritionCard;
