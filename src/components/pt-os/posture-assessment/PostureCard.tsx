'use client';

import { ChevronRight, Download } from 'lucide-react';
import { DonutChart } from '@/components/ui';

const RISK_STYLE: Record<string, { bg: string; color: string }> = {
  Low: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
  Moderate: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
  High: { bg: 'rgba(220,38,38,0.18)', color: '#dc2626' },
};

interface PostureCardProps {
  assessment: Record<string, unknown>;
  onClick: () => void;
  onDownload?: () => void;
}

function countArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export function PostureCard({ assessment, onClick, onDownload }: PostureCardProps) {
  const score = typeof assessment.posture_risk_score === 'number' ? assessment.posture_risk_score : null;
  const level = assessment.posture_risk_level ? String(assessment.posture_risk_level) : null;
  const style = level ? RISK_STYLE[level] : null;
  const date = assessment.assessment_date ? String(assessment.assessment_date).slice(0, 10) : '—';
  const status = String(assessment.status || 'completed');

  const issueCount = new Set([
    ...(Array.isArray(assessment.front_issues) ? assessment.front_issues as string[] : []),
    ...(Array.isArray(assessment.side_issues) ? assessment.side_issues as string[] : []),
    ...(Array.isArray(assessment.back_issues) ? assessment.back_issues as string[] : []),
  ]).size;
  const muscleCount = countArray(assessment.muscle_imbalances);
  const photoCount = [assessment.has_front_photo, assessment.has_side_photo, assessment.has_back_photo].filter(Boolean).length;

  return (
    <div className="flex items-stretch gap-2">
      <button
        type="button" onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-[16px] p-3.5 text-left transition-all hover:scale-[1.005]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex-shrink-0" style={{ width: 52 }}>
          <DonutChart
            data={[
              { name: 'Score', value: score ?? 0, color: '#A33757' },
              { name: 'Remaining', value: 100 - (score ?? 0), color: 'var(--bg-subtle)' },
            ]}
            centerValue={<span style={{ fontSize: 10 }}>{score ?? '—'}</span>}
            hideLegend thin height={52}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-[780]" style={{ color: 'var(--text-primary)' }}>{date}</p>
            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-[800] uppercase tracking-wide" style={{
              background: status === 'draft' ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.12)',
              color: status === 'draft' ? '#b45309' : '#047857',
            }}>
              {status}
            </span>
            {level && style && (
              <span className="rounded-full px-2 py-0.5 text-[9.5px] font-[750]" style={{ background: style.bg, color: style.color }}>
                {level} Risk
              </span>
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
            <span>{issueCount} finding{issueCount === 1 ? '' : 's'}</span>
            {muscleCount > 0 && <span>{muscleCount} muscle{muscleCount === 1 ? '' : 's'}</span>}
            {photoCount > 0 && <span>{photoCount} photo{photoCount === 1 ? '' : 's'}</span>}
            {assessment.assessment_type ? <span className="capitalize">{String(assessment.assessment_type).replace('_', ' ')}</span> : null}
          </p>
        </div>

        <ChevronRight size={15} style={{ color: 'var(--border-2)', flexShrink: 0 }} />
      </button>

      {onDownload && status !== 'draft' && (
        <button
          type="button"
          onClick={onDownload}
          className="flex w-[44px] shrink-0 flex-col items-center justify-center gap-1 rounded-[14px] text-[9px] font-[750]"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          aria-label={`Download report for ${date}`}
        >
          <Download size={15} />
          PDF
        </button>
      )}
    </div>
  );
}

export default PostureCard;
