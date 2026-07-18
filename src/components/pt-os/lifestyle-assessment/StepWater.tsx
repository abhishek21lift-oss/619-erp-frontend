'use client';

import { useMemo } from 'react';
import { Droplets } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { classifyHydration } from '@/lib/lifestyle-calculations';
import type { LifestyleFormData } from './types';
import { n } from './types';

const QUICK_VALUES = [1, 2, 3, 4, 5];

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  Low: { bg: 'rgba(239,68,68,0.14)', color: '#dc2626' },
  Moderate: { bg: 'rgba(249,115,22,0.14)', color: '#ea580c' },
  Optimal: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  Excellent: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
};

interface StepWaterProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
}

export function StepWater({ form, set }: StepWaterProps) {
  const liters = n(form.waterIntakeLiters);
  const { category, score } = useMemo(() => classifyHydration(liters), [liters]);
  const badge = category ? CATEGORY_STYLE[category] : null;

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Droplets size={20} color="#F59E0B" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Water Intake</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 9 — daily hydration, in liters.</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {QUICK_VALUES.map((v) => {
          const selected = liters === v;
          return (
            <button
              key={v} type="button"
              onClick={() => set('waterIntakeLiters', String(v))}
              className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
              style={{
                background: selected ? '#0f172a' : '#f8fafc',
                color: selected ? '#fff' : '#64748b',
                border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
              }}
            >
              {v} L
            </button>
          );
        })}
      </div>

      <div className="max-w-[200px]">
        <FloatInput label="Or enter exactly (L)" type="number" value={form.waterIntakeLiters} onChange={(v) => set('waterIntakeLiters', v)} />
      </div>

      {category && badge && (
        <div className="mt-6 flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
          <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: badge.bg, color: badge.color }}>
            {category}
          </span>
          {score != null && <span className="text-[12.5px] font-[600] text-slate-400">Hydration score {score}</span>}
        </div>
      )}
    </div>
  );
}

export default StepWater;
