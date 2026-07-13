'use client';

import { AlertTriangle } from 'lucide-react';

interface RiskBadgeListProps {
  riskFactors: string[];
  title?: string;
  subtitle?: string;
}

/** Generalized from the various `*RiskBadges` components (HabitRiskBadges,
 *  NutritionRiskBadges, PostureRiskBadges) — colored warning chips for
 *  detected risk factors. Renders nothing when the list is empty. */
export function RiskBadgeList({ riskFactors, title = 'Risk Detection', subtitle = "Flagged from this assessment's answers." }: RiskBadgeListProps) {
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
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">{title}</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">{subtitle}</p>
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

export default RiskBadgeList;
