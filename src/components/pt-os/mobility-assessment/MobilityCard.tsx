'use client';

import { ChevronRight, AlertTriangle } from 'lucide-react';
import { DonutChart } from '@/components/ui';

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  Excellent: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  Good: { bg: 'rgba(245,158,11,0.15)', color: '#d97706' },
  Average: { bg: 'rgba(249,115,22,0.15)', color: '#f97316' },
  'Below Average': { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
  Poor: { bg: 'rgba(220,38,38,0.18)', color: '#dc2626' },
};

interface MobilityCardProps {
  assessment: Record<string, unknown>;
  onClick: () => void;
}

export function MobilityCard({ assessment, onClick }: MobilityCardProps) {
  const score = typeof assessment.mobility_score === 'number' ? assessment.mobility_score : null;
  const category = assessment.mobility_category ? String(assessment.mobility_category) : null;
  const style = category ? CATEGORY_STYLE[category] : null;
  const date = assessment.assessment_date ? String(assessment.assessment_date).slice(0, 10) : '—';

  const bodyRegions = Array.isArray(assessment.body_regions) ? assessment.body_regions as { pain?: boolean }[] : [];
  const mobilityTests = Array.isArray(assessment.mobility_tests) ? assessment.mobility_tests as { pain?: boolean }[] : [];
  const painCount = [...bodyRegions, ...mobilityTests].filter((i) => i.pain === true).length;

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
          {category && style && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: style.bg, color: style.color }}>
              {category}
            </span>
          )}
          {painCount > 0 && (
            <span className="flex items-center gap-1 text-[11.5px] font-[600]" style={{ color: '#dc2626' }}>
              <AlertTriangle size={11} /> {painCount} pain point{painCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
    </button>
  );
}

export default MobilityCard;
