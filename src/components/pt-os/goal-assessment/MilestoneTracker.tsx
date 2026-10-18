'use client';
import { useMemo } from 'react';
import { generateMilestones } from '@/lib/goal-scheduling';

export default function MilestoneTracker({ startDate, targetDate }: { startDate?: string | null; targetDate?: string | null }) {
  const milestones = useMemo(() => generateMilestones(startDate, targetDate, 8, 12), [startDate, targetDate]);
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-6">
        <p className="text-[13px] font-[760] text-[color:var(--text-primary)] mb-3">Milestones</p>
        <ul className="space-y-2">
          {milestones.map((m) => (
            <li key={m.date + m.label} className="flex items-center justify-between text-[12px]">
              <span className="text-[color:var(--text-secondary)]">{m.label}</span>
              <span className="font-[600] text-[color:var(--text-muted)]">{m.date}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
