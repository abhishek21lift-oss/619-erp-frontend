'use client';

import { Gauge } from 'lucide-react';
import { DonutChart } from '@/components/ui';
import FitnessRadarChart from '@/components/pt-os/FitnessRadarChart';
import { band, palette } from '@/lib/palette';

export interface LifestyleScores {
  sleepScore: number | null;
  stressScore: number | null;
  hydrationScore: number | null;
  activityScore: number | null;
  nutritionScore: number | null;
  recoveryScore: number | null;
  lifestyleScore: number | null;
  lifestyleReadiness: string | null;
}

const CATEGORY_META: { key: keyof LifestyleScores; label: string }[] = [
  { key: 'sleepScore', label: 'Sleep' },
  { key: 'stressScore', label: 'Stress' },
  { key: 'hydrationScore', label: 'Hydration' },
  { key: 'activityScore', label: 'Activity' },
  { key: 'nutritionScore', label: 'Nutrition' },
  { key: 'recoveryScore', label: 'Recovery' },
];

const READINESS_COLOR: Record<string, string> = {
  Excellent: band.best, Good: band.good, Average: band.mid,
  'Needs Improvement': band.poor, 'High Risk': band.worst,
};

function scoreColor(score: number | null): string {
  if (score == null) return palette.gray[400];
  if (score >= 80) return band.best;
  if (score >= 60) return band.good;
  if (score >= 40) return band.mid;
  return band.worst;
}

interface LifestyleDashboardProps {
  scores: LifestyleScores;
}

export function LifestyleDashboard({ scores }: LifestyleDashboardProps) {
  const radarData = CATEGORY_META.map((c) => ({ category: c.label, score: scores[c.key] as number ?? 0 }));
  const overall = scores.lifestyleScore;
  const readinessColor = scores.lifestyleReadiness ? READINESS_COLOR[scores.lifestyleReadiness] : '#94a3b8';

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}>
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(0,103,224,0.15)' }}>
            <Gauge size={20} color="#0067E0" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-white leading-none">Lifestyle Dashboard</h2>
            <p className="text-[13px] text-white/40 mt-1.5">Daily habits &amp; recovery, at a glance.</p>
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
              centerLabel="Lifestyle Score"
              hideLegend
              thin
              height={220}
            />
            {scores.lifestyleReadiness && (
              <div className="mt-3 flex justify-center">
                <span className="rounded-full px-3 py-1 text-[12.5px] font-[800]" style={{ background: `${readinessColor}26`, color: readinessColor }}>
                  {scores.lifestyleReadiness}
                </span>
              </div>
            )}
          </div>
          <FitnessRadarChart data={radarData} height={240} />
        </div>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORY_META.map((c) => {
            const score = scores[c.key] as number | null;
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

export default LifestyleDashboard;
