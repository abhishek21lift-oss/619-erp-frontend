'use client';

import { ChevronRight, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import type { ParqForm } from '@/lib/api';

const RISK_STYLE: Record<string, { bg: string; color: string; icon: typeof ShieldCheck }> = {
  low: { bg: 'rgba(16,185,129,0.15)', color: '#059669', icon: ShieldCheck },
  medium: { bg: 'rgba(245,158,11,0.15)', color: '#d97706', icon: ShieldQuestion },
  high: { bg: 'rgba(220,38,38,0.15)', color: '#dc2626', icon: ShieldAlert },
};

interface ParqCardProps {
  form: ParqForm;
  onClick: () => void;
}

export function ParqCard({ form, onClick }: ParqCardProps) {
  const risk = form.risk_level ? RISK_STYLE[form.risk_level] : null;
  const Icon = risk?.icon ?? ShieldQuestion;
  const date = form.assessment_date ? String(form.assessment_date).slice(0, 10) : '—';
  const gated = form.workout_gate_status === 'blocked';

  return (
    <button
      type="button" onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[20px] p-5 text-left transition-all hover:scale-[1.01]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}
    >
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px]"
        style={{ background: risk?.bg ?? 'var(--bg-subtle)' }}
      >
        <Icon size={20} color={risk?.color ?? '#94a3b8'} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-[760] text-slate-900">{date}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {form.risk_level && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700] capitalize" style={{ background: risk?.bg, color: risk?.color }}>
              {form.risk_level} risk
            </span>
          )}
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700] capitalize" style={{ background: '#f1f5f9', color: '#64748b' }}>
            {form.status}
          </span>
          {gated && (
            <span className="text-[11px] font-[700]" style={{ color: '#dc2626' }}>Workout Blocked</span>
          )}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
    </button>
  );
}

export default ParqCard;
