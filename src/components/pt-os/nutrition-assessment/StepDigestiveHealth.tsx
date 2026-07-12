'use client';

import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import DigestiveIssuesChecklist from './DigestiveIssuesChecklist';
import { calcDigestiveHealthScore } from '@/lib/nutrition-calculations';
import type { NutritionFormData } from './types';

interface StepDigestiveHealthProps {
  form: NutritionFormData;
  set: <K extends keyof NutritionFormData>(key: K, val: NutritionFormData[K]) => void;
}

export function StepDigestiveHealth({ form, set }: StepDigestiveHealthProps) {
  const score = useMemo(() => calcDigestiveHealthScore(form.digestiveIssues), [form.digestiveIssues]);
  const noIssues = form.digestiveIssues.length === 0;

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Activity size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Digestive Health</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 5 of 8 — select any recurring issues.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => set('digestiveIssues', [])}
          className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
          style={{
            background: noIssues ? '#0f172a' : '#f8fafc',
            color: noIssues ? '#fff' : '#64748b',
            border: noIssues ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
          }}
        >
          No Issues
        </button>

        <DigestiveIssuesChecklist value={form.digestiveIssues} onChange={(v) => set('digestiveIssues', v)} />

        <div className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
          <span className="text-[12.5px] font-[600] text-slate-400">Digestive Health Score</span>
          <span className="text-[16px] font-[800]" style={{ color: score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626' }}>{score}</span>
        </div>
      </div>
    </div>
  );
}

export default StepDigestiveHealth;
