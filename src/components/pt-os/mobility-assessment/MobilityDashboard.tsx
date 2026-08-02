'use client';

import { Gauge } from 'lucide-react';
import { DonutChart } from '@/components/ui';
import FitnessRadarChart from '@/components/pt-os/FitnessRadarChart';
import type { BodyRegionScore } from '@/lib/mobility-calculations';

const READINESS_COLOR: Record<string, string> = {
  Excellent: '#10b981', Good: '#F59E0B', Average: '#f97316', 'Below Average': '#ef4444', Poor: '#dc2626',
};

function scoreColor(score: number | null): string {
  if (score == null) return '#94a3b8';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

interface MobilityDashboardProps {
  mobilityScore: number | null;
  mobilityCategory: string | null;
  bodyRegions: BodyRegionScore[];
}

export function MobilityDashboard({ mobilityScore, mobilityCategory, bodyRegions }: MobilityDashboardProps) {
  const radarData = bodyRegions.map((r) => ({ category: r.region, score: (r.score ?? 0) * 20 }));
  const readinessColor = mobilityCategory ? READINESS_COLOR[mobilityCategory] : '#94a3b8';

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', boxShadow: '0 12px 40px rgba(15,23,42,0.25)' }}>
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: 'rgba(0,103,224,0.15)' }}>
            <Gauge size={20} color="#0067E0" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-white leading-none">Mobility Dashboard</h2>
            <p className="text-[13px] text-white/40 mt-1.5">Range of motion across all assessed regions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <DonutChart
              data={[
                { name: 'Score', value: mobilityScore ?? 0, color: scoreColor(mobilityScore) },
                { name: 'Remaining', value: 100 - (mobilityScore ?? 0), color: 'rgba(255,255,255,0.08)' },
              ]}
              centerValue={<span style={{ color: '#fff' }}>{mobilityScore ?? '—'}</span>}
              centerLabel="Mobility Score"
              hideLegend
              thin
              height={220}
            />
            {mobilityCategory && (
              <div className="mt-3 flex justify-center">
                <span className="rounded-full px-3 py-1 text-[12.5px] font-[800]" style={{ background: `${readinessColor}26`, color: readinessColor }}>
                  {mobilityCategory}
                </span>
              </div>
            )}
          </div>
          <FitnessRadarChart data={radarData} height={260} />
        </div>
      </div>
    </div>
  );
}

export default MobilityDashboard;
