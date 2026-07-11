'use client';

import { ClipboardList } from 'lucide-react';

interface GoalSummaryCardProps {
  primaryGoalLabel: string;
  currentWeight: number | null;
  targetWeight: number | null;
  currentBodyFat: number | null;
  targetBodyFat: number | null;
  targetDate: string;
  priorityLabel: string;
  motivationLevel: number;
  commitmentLevel: number;
}

export function GoalSummaryCard({
  primaryGoalLabel, currentWeight, targetWeight, currentBodyFat, targetBodyFat,
  targetDate, priorityLabel, motivationLevel, commitmentLevel,
}: GoalSummaryCardProps) {
  const weightDiff = currentWeight != null && targetWeight != null ? Math.round((targetWeight - currentWeight) * 10) / 10 : null;

  const rows: { label: string; value: string }[] = [
    { label: 'Primary Goal', value: primaryGoalLabel || '—' },
    { label: 'Current Weight', value: currentWeight != null ? `${currentWeight} kg` : '—' },
    { label: 'Target Weight', value: targetWeight != null ? `${targetWeight} kg` : '—' },
    { label: 'Current Body Fat', value: currentBodyFat != null ? `${currentBodyFat}%` : '—' },
    { label: 'Target Body Fat', value: targetBodyFat != null ? `${targetBodyFat}%` : '—' },
    { label: 'Weight Difference', value: weightDiff != null ? `${weightDiff > 0 ? '+' : ''}${weightDiff} kg` : '—' },
    { label: 'Target Date', value: targetDate || '—' },
    { label: 'Priority', value: priorityLabel || '—' },
    { label: 'Motivation', value: `${motivationLevel} / 10` },
    { label: 'Commitment', value: `${commitmentLevel} / 10` },
  ];

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <ClipboardList size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Goal Summary</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Everything captured, at a glance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-[12px] px-4 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
              <span className="text-[12px] font-[600] text-slate-500">{r.label}</span>
              <span className="text-[13px] font-[760] text-slate-900">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GoalSummaryCard;
