'use client';

import { AlertTriangle } from 'lucide-react';

interface NutritionRiskBadgesProps {
  riskFactors: string[];
}

/** Colored warning chips for detected nutrition risks (Low Protein Intake,
 *  Poor Hydration, Frequent Digestive Issues, Excess Sugar/Processed Food,
 *  Nutrient Deficiency Risk, Alcohol Risk, Smoking Impact on Nutrition —
 *  the last two sourced from the client's latest Lifestyle Assessment). */
export function NutritionRiskBadges({ riskFactors }: NutritionRiskBadgesProps) {
  if (riskFactors.length === 0) return null;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <AlertTriangle size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Nutrition Risk Detection</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Flagged from this assessment&apos;s answers.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {riskFactors.map((r) => (
            <span key={r} className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-[700]" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
              <AlertTriangle size={12} /> {r}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NutritionRiskBadges;
