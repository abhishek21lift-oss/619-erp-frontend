'use client';

import Link from 'next/link';
import { CalendarCheck, ExternalLink, RotateCcw } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { gray, tint, indigo, emerald, amber } from '@/lib/palette';
import BaselineScreeningCard from './BaselineScreeningCard';
import type { BaselineMetric, BaselineSource } from './BaselineScreeningCard';
import type { GoalFormData, RetestInfo } from './types';

interface StepAssessmentReviewProps {
  form: GoalFormData;
  set: <K extends keyof GoalFormData>(key: K, val: GoalFormData[K]) => void;
  step: number;
  sources: BaselineSource[];
  metrics: BaselineMetric[];
  retest: RetestInfo;
  clientId: string;
  error?: string;
}

/**
 * K11's final section: the initial assessment baseline, the next re-test
 * date from the Module 5 scheduler, and the goal review date that is saved
 * to pt_goals.review_date.
 */
export function StepAssessmentReview({
  form, set, step, sources, metrics, retest, clientId, error,
}: StepAssessmentReviewProps) {
  const scheduled = retest.state === 'upcoming' || retest.state === 'due' || retest.state === 'overdue' || retest.state === 'rescheduled';
  const stateColor = retest.state === 'overdue' ? amber[700] : scheduled ? emerald[700] : gray[600];
  const stateWash = scheduled ? tint(emerald[500], 0.12) : tint(amber[500], 0.14);

  return (
    <BaselineScreeningCard sources={sources} metrics={metrics} step={step}>
      <div className="mt-6 rounded-[16px] p-5" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: tint(indigo[500], 0.1) }}>
              <RotateCcw size={16} style={{ color: indigo[700] }} />
            </div>
            <div>
              <p className="text-[13px] font-[760]" style={{ color: gray[800] }}>Next re-test / check-in</p>
              <p className="mt-0.5 text-[12px]" style={{ color: gray[500] }}>
                {scheduled && retest.date
                  ? `${retest.date}${retest.cadenceMonths ? ` · every ${retest.cadenceMonths} months` : ''}`
                  : retest.label || 'No re-test scheduled yet'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[11px] font-[760]" style={{ background: stateWash, color: stateColor }}>
              {retest.label || 'Not scheduled'}
            </span>
            <Link
              href={`/pt-os/progress?client_id=${encodeURIComponent(clientId)}`}
              className="inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-[700]"
              style={{ background: tint(indigo[500], 0.1), color: indigo[700] }}
            >
              Progress <ExternalLink size={11} />
            </Link>
          </div>
        </div>

        <div className="mt-4 max-w-[280px]">
          <FloatInput
            label="Goal review date" type="date"
            value={form.reviewDate} onChange={(v) => set('reviewDate', v)}
            error={error}
          />
        </div>
        <p className="mt-2 text-[11.5px]" style={{ color: gray[500] }}>
          Saved as this goal&apos;s review date. K11 schedules re-testing every 4–6 months.
        </p>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[12px] px-3.5 py-2.5 text-[11.5px]" style={{ background: tint(indigo[500], 0.06), color: gray[600] }}>
        <CalendarCheck size={14} style={{ color: indigo[600], flexShrink: 0, marginTop: 1 }} />
        Initial assessment date is the date on the fitness assessment row above; the re-test date comes from the Progress scheduler.
      </div>
    </BaselineScreeningCard>
  );
}

export default StepAssessmentReview;
