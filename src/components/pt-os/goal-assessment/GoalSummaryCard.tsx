'use client';

import { ClipboardList } from 'lucide-react';
import GoalStepCard from './GoalStepCard';
import { indigo, gray, tint } from '@/lib/palette';
import { formatGoalMeasure } from '@/lib/goal-plan';
import type { BarrierPlan, GoalMeasure, GoalMilestone } from '@/lib/goal-plan';

export interface SummaryAvailability {
  /** "3 days × 60 min · 3 h/week". */
  commitment: string;
  preferredDays: string[];
  timeOfDayLabel: string;
}

interface GoalSummaryCardProps {
  primaryGoalLabel: string;
  statement: string;
  successMetric: string;
  measure: GoalMeasure | null;
  currentWeight: number | null;
  targetWeight: number | null;
  currentBodyFat: number | null;
  targetBodyFat: number | null;
  targetDate: string;
  priorityLabel: string;
  clientAgreed: boolean;
  clientExpectation: string;
  motivationLevel: number;
  confidenceLevel: number;
  commitmentLevel: number;
  barriers: BarrierPlan[];
  availability: SummaryAvailability;
  milestones: GoalMilestone[];
  reviewDate: string;
}

export function GoalSummaryCard({
  primaryGoalLabel, statement, successMetric, measure,
  currentWeight, targetWeight, currentBodyFat, targetBodyFat,
  targetDate, priorityLabel, clientAgreed, clientExpectation,
  motivationLevel, confidenceLevel, commitmentLevel,
  barriers, availability, milestones, reviewDate,
}: GoalSummaryCardProps) {
  const weightDiff = currentWeight != null && targetWeight != null ? Math.round((targetWeight - currentWeight) * 10) / 10 : null;
  const measureLabel = formatGoalMeasure(measure);

  const rows: { label: string; value: string }[] = [
    { label: 'Primary Goal', value: primaryGoalLabel || '—' },
    ...(measureLabel ? [{ label: 'Measurable Target', value: measureLabel }] : []),
    ...(targetWeight != null
      ? [
        { label: 'Current Weight', value: currentWeight != null ? `${currentWeight} kg` : '—' },
        { label: 'Target Weight', value: `${targetWeight} kg` },
      ]
      : []),
    ...(targetBodyFat != null
      ? [
        { label: 'Current Body Fat', value: currentBodyFat != null ? `${currentBodyFat}%` : '—' },
        { label: 'Target Body Fat', value: `${targetBodyFat}%` },
      ]
      : []),
    ...(weightDiff != null ? [{ label: 'Weight Difference', value: `${weightDiff > 0 ? '+' : ''}${weightDiff} kg` }] : []),
    { label: 'Target Date', value: targetDate || '—' },
    { label: 'Priority', value: priorityLabel || '—' },
    { label: 'Client Agreement', value: clientAgreed ? 'Agreed' : 'Not confirmed' },
    { label: 'Motivation', value: `${motivationLevel} / 10` },
    { label: 'Confidence', value: `${confidenceLevel} / 10` },
    { label: 'Commitment', value: `${commitmentLevel} / 10` },
    { label: 'Availability', value: availability.commitment },
    ...(reviewDate ? [{ label: 'Next Review', value: reviewDate }] : []),
  ];

  return (
    <GoalStepCard icon={ClipboardList} title="Goal Summary" hint="everything captured, at a glance">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-[12px] px-4 py-2.5" style={{ background: gray[50] }}>
            <span className="text-[12px] font-[600]" style={{ color: gray[500] }}>{r.label}</span>
            <span className="text-[13px] font-[760]" style={{ color: gray[800] }}>{r.value}</span>
          </div>
        ))}
      </div>

      {(statement || successMetric) && (
        <div className="mt-6 rounded-[16px] p-5" style={{ background: tint(indigo[500], 0.06), border: `1px solid ${tint(indigo[500], 0.18)}` }}>
          <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: indigo[700] }}>SMART Statement</p>
          <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: gray[800] }}>{statement || '—'}</p>
          {successMetric && (
            <p className="mt-2 text-[12px]" style={{ color: gray[600] }}>
              Success measured by: <span className="font-[700]">{successMetric}</span>
            </p>
          )}
        </div>
      )}

      {clientExpectation && (
        <div className="mt-4 rounded-[14px] px-4 py-3" style={{ background: gray[50] }}>
          <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>Client Expectation</p>
          <p className="mt-1 text-[12.5px]" style={{ color: gray[700] }}>{clientExpectation}</p>
        </div>
      )}

      {barriers.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>Barriers & Mitigation Plans</p>
          <ul className="space-y-2">
            {barriers.map((b) => (
              <li key={b.challenge} className="rounded-[12px] px-4 py-2.5" style={{ background: gray[50] }}>
                <p className="text-[12.5px] font-[760]" style={{ color: gray[800] }}>{b.challenge}</p>
                <p className="text-[12px]" style={{ color: gray[600] }}>{b.plan}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {availability.preferredDays.length > 0 && (
        <p className="mt-4 text-[12px]" style={{ color: gray[600] }}>
          Preferred days: <span className="font-[700]">{availability.preferredDays.join(', ')}</span>
          {availability.timeOfDayLabel ? <> · {availability.timeOfDayLabel}</> : null}
        </p>
      )}

      {milestones.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>Time Horizons</p>
          <ul className="space-y-1.5">
            {milestones.map((mst) => (
              <li key={`${mst.type}-${mst.date}-${mst.label}`} className="flex flex-wrap items-baseline justify-between gap-2 text-[12px]">
                <span style={{ color: gray[700] }}>{mst.label}</span>
                <span className="font-[600]" style={{ color: gray[500] }}>{mst.date}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </GoalStepCard>
  );
}

export default GoalSummaryCard;
