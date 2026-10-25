'use client';
import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import { defaultMilestones } from '@/lib/goal-plan';
import GoalStepCard from './GoalStepCard';
import type { GoalMilestone } from '@/lib/goal-plan';

/**
 * Milestones as the client's own plan. When the wizard has confirmed ones,
 * they are shown instead of a freshly generated guess — two different dates
 * for the same checkpoint is how a trainer stops trusting the review screen.
 */
export default function MilestoneTracker({ startDate, targetDate, milestones }: { startDate?: string | null; targetDate?: string | null; milestones?: GoalMilestone[] }) {
  const rows = useMemo(() => {
    if (milestones?.length) return milestones.map((m) => ({ label: m.label, date: m.date }));
    const start = startDate || new Date().toISOString().slice(0, 10);
    return defaultMilestones(start, targetDate, 8, 12).map((m) => ({ label: m.label, date: m.date }));
  }, [milestones, startDate, targetDate]);

  return (
    <GoalStepCard icon={CalendarRange} title="Milestones">
      <ul className="space-y-2">
        {rows.map((m) => (
          <li key={m.date + m.label} className="flex items-center justify-between text-[12px]">
            <span className="text-[color:var(--text-secondary)]">{m.label}</span>
            <span className="font-[600] text-[color:var(--text-muted)]">{m.date}</span>
          </li>
        ))}
      </ul>
    </GoalStepCard>
  );
}
