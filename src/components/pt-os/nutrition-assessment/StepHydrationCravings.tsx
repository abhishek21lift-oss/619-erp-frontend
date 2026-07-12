'use client';

import { useMemo } from 'react';
import { GlassWater } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import { calcDailyFluidIntake, calcHydrationScore } from '@/lib/nutrition-calculations';
import type { NutritionFormData } from './types';
import { n } from './types';
import type { CravingFrequency } from '@/lib/nutrition-calculations';

const QUICK_VALUES = [1, 2, 3, 4, 5];

const CRAVING_OPTIONS = ['Sweet', 'Salty', 'Spicy', 'Fried Food', 'Fast Food', 'Chocolate', 'Dairy', 'No Cravings'];

const CRAVING_FREQUENCY_OPTIONS: { value: CravingFrequency; label: string }[] = [
  { value: 'rare', label: 'Rare' }, { value: 'sometimes', label: 'Sometimes' }, { value: 'daily', label: 'Daily' },
];

const CATEGORY_STYLE: Record<string, { bg: string; color: string }> = {
  Low: { bg: 'rgba(239,68,68,0.14)', color: '#dc2626' },
  Moderate: { bg: 'rgba(249,115,22,0.14)', color: '#ea580c' },
  Optimal: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  Excellent: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
};

function hydrationLabel(score: number | null): string | null {
  if (score == null) return null;
  if (score < 40) return 'Low';
  if (score < 70) return 'Moderate';
  if (score < 95) return 'Optimal';
  return 'Excellent';
}

interface StepHydrationCravingsProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
  error?: string;
}

export function StepHydrationCravings({ form, set, error }: StepHydrationCravingsProps) {
  const liters = n(form.waterIntakeLiters);
  const dailyFluidIntake = useMemo(
    () => calcDailyFluidIntake(liters, n(form.teaCupsPerDay), n(form.coffeeCupsPerDay), n(form.softDrinksPerDay), n(form.juicesPerDay)),
    [liters, form.teaCupsPerDay, form.coffeeCupsPerDay, form.softDrinksPerDay, form.juicesPerDay]
  );
  const hydrationScore = useMemo(() => calcHydrationScore(liters, n(form.softDrinksPerDay), n(form.alcoholicDrinksPerWeek)), [liters, form.softDrinksPerDay, form.alcoholicDrinksPerWeek]);
  const label = hydrationLabel(hydrationScore);
  const badge = label ? CATEGORY_STYLE[label] : null;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <GlassWater size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Hydration &amp; Cravings</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 7 of 8 — fluid intake and craving patterns.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Water Intake (L)</p>
          <div className="mb-3 flex gap-2">
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
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FloatInput label="Tea (cups/day)" type="number" value={form.teaCupsPerDay} onChange={(v) => set('teaCupsPerDay', v)} />
          <FloatInput label="Coffee (cups/day)" type="number" value={form.coffeeCupsPerDay} onChange={(v) => set('coffeeCupsPerDay', v)} />
          <FloatInput label="Soft Drinks/day" type="number" value={form.softDrinksPerDay} onChange={(v) => set('softDrinksPerDay', v)} />
          <FloatInput label="Juices/day" type="number" value={form.juicesPerDay} onChange={(v) => set('juicesPerDay', v)} />
        </div>

        <div className="max-w-[220px]">
          <FloatInput label="Alcoholic Drinks/week" type="number" value={form.alcoholicDrinksPerWeek} onChange={(v) => set('alcoholicDrinksPerWeek', v)} />
        </div>

        {(dailyFluidIntake != null || label) && (
          <div className="flex flex-wrap items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
            {dailyFluidIntake != null && <span className="text-[12.5px] font-[600] text-slate-400">Daily Fluid Intake ≈ <strong className="text-slate-700">{dailyFluidIntake} L</strong></span>}
            {label && badge && (
              <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: badge.bg, color: badge.color }}>
                {label} Hydration
              </span>
            )}
          </div>
        )}

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Cravings</p>
          <MultiSelectChips value={form.cravings} onChange={(v) => set('cravings', v)} options={CRAVING_OPTIONS} />
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Craving Frequency</p>
          <div className="flex gap-2">
            {CRAVING_FREQUENCY_OPTIONS.map((o) => {
              const selected = form.cravingFrequency === o.value;
              return (
                <button
                  key={o.value} type="button" onClick={() => set('cravingFrequency', o.value)}
                  className="rounded-[11px] px-4 py-2 text-[12.5px] font-[700] transition-all"
                  style={{
                    background: selected ? '#0f172a' : '#f8fafc',
                    color: selected ? '#fff' : '#64748b',
                    border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepHydrationCravings;
