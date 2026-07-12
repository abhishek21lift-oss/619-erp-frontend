'use client';

import { Cigarette, Wine } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { LifestyleFormData } from './types';

const SMOKING_OPTIONS: { value: LifestyleFormData['smokingStatus']; label: string; icon: string }[] = [
  { value: 'never', label: 'Never', icon: '🚭' },
  { value: 'occasionally', label: 'Occasionally', icon: '🚬' },
  { value: 'daily', label: 'Daily', icon: '🚬' },
  { value: 'former', label: 'Former Smoker', icon: '🚬' },
];

const ALCOHOL_OPTIONS: { value: LifestyleFormData['alcoholStatus']; label: string; icon: string }[] = [
  { value: 'never', label: 'Never', icon: '🍷' },
  { value: 'occasionally', label: 'Occasionally', icon: '🍺' },
  { value: 'weekly', label: 'Weekly', icon: '🍻' },
  { value: 'frequently', label: 'Frequently', icon: '🥃' },
];

interface StepSmokingAlcoholProps {
  form: LifestyleFormData;
  set: <K extends keyof LifestyleFormData>(key: K, val: LifestyleFormData[K]) => void;
  error?: string;
}

export function StepSmokingAlcohol({ form, set, error }: StepSmokingAlcoholProps) {
  const smokes = form.smokingStatus && form.smokingStatus !== 'never';
  const drinks = form.alcoholStatus && form.alcoholStatus !== 'never';

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Cigarette size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Smoking &amp; Alcohol</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 8 of 9 — habits that affect recovery and risk.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Smoking</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SMOKING_OPTIONS.map((o) => {
              const selected = form.smokingStatus === o.value;
              return (
                <button
                  key={o.value} type="button"
                  onClick={() => set('smokingStatus', o.value)}
                  className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                  style={{
                    background: selected ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
                    border: selected ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)',
                    boxShadow: selected ? '0 4px 16px rgba(245,158,11,0.18)' : 'none',
                  }}
                >
                  <span className="text-[20px]">{o.icon}</span>
                  <span className="text-[11.5px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{o.label}</span>
                </button>
              );
            })}
          </div>
          {smokes && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FloatInput label="Cigarettes Per Day" type="number" value={form.cigarettesPerDay} onChange={(v) => set('cigarettesPerDay', v)} />
              <FloatInput label="Years of Smoking" type="number" value={form.yearsSmoking} onChange={(v) => set('yearsSmoking', v)} />
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <Wine size={14} style={{ color: '#94a3b8' }} />
            <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Alcohol</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {ALCOHOL_OPTIONS.map((o) => {
              const selected = form.alcoholStatus === o.value;
              return (
                <button
                  key={o.value} type="button"
                  onClick={() => set('alcoholStatus', o.value)}
                  className="flex flex-col items-center gap-2 rounded-[16px] px-3 py-4 text-center transition-all duration-200"
                  style={{
                    background: selected ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)',
                    border: selected ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)',
                    boxShadow: selected ? '0 4px 16px rgba(245,158,11,0.18)' : 'none',
                  }}
                >
                  <span className="text-[20px]">{o.icon}</span>
                  <span className="text-[11.5px] font-[700]" style={{ color: selected ? '#0f172a' : '#475569' }}>{o.label}</span>
                </button>
              );
            })}
          </div>
          {drinks && (
            <div className="mt-4 max-w-[220px]">
              <FloatInput label="Drinks Per Week" type="number" value={form.drinksPerWeek} onChange={(v) => set('drinksPerWeek', v)} />
            </div>
          )}
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepSmokingAlcohol;
