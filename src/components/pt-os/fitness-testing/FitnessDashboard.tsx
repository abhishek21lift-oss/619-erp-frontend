'use client';

import { Gauge } from 'lucide-react';
import { DonutChart } from '@/components/ui';
import FitnessRadarChart from '@/components/pt-os/FitnessRadarChart';
import { scoreCoverage, formatCoverage } from '@/lib/fitness-calculations';

export interface FitnessScores {
  cardioScore: number | null;
  strengthScore: number | null;
  enduranceScore: number | null;
  mobilityScore: number | null;
  bodyCompositionScore: number | null;
  healthRiskScore: number | null;
  overallScore: number | null;
}

const CATEGORY_META: { key: keyof FitnessScores; label: string }[] = [
  { key: 'cardioScore', label: 'Cardio' },
  { key: 'strengthScore', label: 'Strength' },
  { key: 'enduranceScore', label: 'Endurance' },
  { key: 'mobilityScore', label: 'Mobility' },
  { key: 'bodyCompositionScore', label: 'Body Comp.' },
  { key: 'healthRiskScore', label: 'Health Risk' },
];

function scoreColor(score: number | null): string {
  if (score == null) return 'var(--text-muted)';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

interface FitnessDashboardProps {
  scores: FitnessScores;
}

export function FitnessDashboard({ scores }: FitnessDashboardProps) {
  const coverage = scoreCoverage(scores);
  // Missing categories stay null all the way into the radar — never 0, so a
  // skipped test is a gap, not a measured zero.
  const radarData = CATEGORY_META.map((c) => ({ category: c.label, score: scores[c.key] }));
  const overall = scores.overallScore;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}>
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(0,103,224,0.15)' }}>
            <Gauge size={20} color="#0067E0" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-white leading-none">Fitness Dashboard</h2>
            <p className="text-[13px] text-white/40 mt-1.5">
              {coverage.isComplete
                ? 'Overall performance across all 6 categories.'
                : `Partial assessment — ${formatCoverage(coverage)}.`}
            </p>
            <p
              className="mt-2 inline-block rounded-full px-3 py-1 text-[12px] font-[700]"
              style={coverage.isComplete
                ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                : { background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
            >
              {coverage.isComplete ? `Complete · ${formatCoverage(coverage)}` : `Partial · ${formatCoverage(coverage)}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <DonutChart
              data={[
                { name: 'Score', value: overall ?? 0, color: scoreColor(overall) },
                { name: 'Remaining', value: 100 - (overall ?? 0), color: 'rgba(255,255,255,0.08)' },
              ]}
              centerValue={<span style={{ color: '#fff' }}>{overall ?? '—'}</span>}
              centerLabel="Overall Score"
              hideLegend
              thin
              height={220}
            />
            {!coverage.isComplete && (
              <p className="mt-3 text-center text-[12px] font-[600] text-white/40">
                {coverage.available === 0
                  ? 'No categories scored yet — no overall score.'
                  : `Overall score based on ${formatCoverage(coverage)}.`}
              </p>
            )}
          </div>
          <FitnessRadarChart data={radarData} height={240} />
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORY_META.map((c) => {
            const score = scores[c.key];
            return (
              <div key={c.key} className="rounded-[14px] p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[10.5px] font-[700] uppercase tracking-wider text-white/40">{c.label}</p>
                <p className="mt-1 text-[20px] font-[800]" style={{ color: scoreColor(score) }}>{score ?? '—'}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FitnessDashboard;
