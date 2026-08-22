'use client';

import { ChevronRight, Target } from 'lucide-react';
import { PremiumProgressChart } from '@/components/visualizations';
import { calcCompletionPct, calcAchievementStatus, daysRemaining } from '@/lib/goal-calculations';
import { GOAL_TYPE_META } from './types';

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  not_started: { bg: 'rgba(148,163,184,0.15)', color: '#64748b', label: 'Not Started' },
  on_track: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'On Track' },
  behind: { bg: 'rgba(245,158,11,0.15)', color: '#d97706', label: 'Behind' },
  achieved: { bg: 'rgba(16,185,129,0.2)', color: '#059669', label: 'Achieved' },
  expired: { bg: 'rgba(239,68,68,0.15)', color: '#dc2626', label: 'Expired' },
};

interface GoalCardProps {
  goal: Record<string, unknown>;
  latestWeight: number | null;
  onClick: () => void;
}

function num(v: unknown): number | null {
  const f = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(f) ? f : null;
}

export function GoalCard({ goal, latestWeight, onClick }: GoalCardProps) {
  const meta = GOAL_TYPE_META.find((g) => g.value === goal.goal_type) || null;
  const label = goal.goal_type === 'custom' ? (String(goal.goal_other || '') || 'Custom Goal') : (meta?.label || String(goal.goal_type ?? ''));

  const starting = num(goal.starting_weight);
  const target = num(goal.target_weight);
  const completion = calcCompletionPct(starting, target, latestWeight);
  const targetDate = goal.target_date ? String(goal.target_date).slice(0, 10) : null;
  const days = daysRemaining(targetDate);
  const totalDays = targetDate && goal.created_at
    ? Math.ceil((new Date(targetDate).getTime() - new Date(String(goal.created_at)).getTime()) / 86400000)
    : null;
  const status = STATUS_STYLE[calcAchievementStatus(completion, days, totalDays)];

  return (
    <button
      type="button" onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[20px] p-5 text-left transition-all hover:scale-[1.01]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(15,23,42,0.06)' }}
    >
      {/* Only drawn when the server could compute a completion percentage —
          a ring at 0% and "no starting weight on file" look identical, and
          the first one is a claim about this goal rather than the record. */}
      <div className="flex-shrink-0" style={{ width: 64 }}>
        {completion != null ? (
          <PremiumProgressChart
            data={[{ id: label, value: completion, max: 100 }]}
            height={64}
            bordered={false}
            showLegend={false}
          />
        ) : (
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-[13px] font-[700]"
            style={{ border: '3px solid var(--bg-subtle)', color: 'var(--text-muted)' }}
          >
            —
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {/* Target is also the 'custom' goal icon, which is the right
              fallback for a goal_type this build does not know about. */}
          {(() => { const Icon = meta?.icon ?? Target; return <Icon size={15} strokeWidth={2} className="flex-shrink-0" style={{ color: '#0059CE' }} />; })()}
          <p className="text-[14px] font-[760] text-slate-900 truncate">{label}</p>
          {!goal.is_active && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-[700]" style={{ background: 'rgba(148,163,184,0.15)', color: '#64748b' }}>Inactive</span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-[700]" style={{ background: status.bg, color: status.color }}>
            {status.label}
          </span>
          {days != null && (
            <span className="text-[11.5px] font-[600] text-slate-400">
              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d remaining`}
            </span>
          )}
          {goal.goal_difficulty != null && (
            <span className="text-[11.5px] font-[600] text-slate-400">· {String(goal.goal_difficulty)}</span>
          )}
        </div>
      </div>

      <ChevronRight size={16} style={{ color: '#cbd5e1', flexShrink: 0 }} />
    </button>
  );
}

export default GoalCard;
