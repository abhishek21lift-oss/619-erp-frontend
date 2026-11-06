'use client';

import { CalendarDays, History, UserRound } from 'lucide-react';
import { FormField, SelectInput } from '@/components/ui';
import AssessmentDateField from '@/components/pt-os/shared/AssessmentDateField';
import { ASSESSMENT_TYPES } from './types';
import type { AssessmentType, PostureFormData } from './types';

interface StepOverviewProps {
  form: PostureFormData;
  set: <K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => void;
  clientName: string;
  previous: Record<string, unknown> | null;
  assessmentNumber?: number | null;
}

function previousLabel(previous: Record<string, unknown> | null): string {
  if (!previous) return 'No previous posture assessment';
  const date = previous.assessment_date ? String(previous.assessment_date).slice(0, 10) : '—';
  const number = previous.assessment_number ? `#${previous.assessment_number}` : '';
  return `Assessment ${number} — ${date}`.replace('  ', ' ');
}

export function StepAssessmentOverview({ form, set, clientName, previous, assessmentNumber }: StepOverviewProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-[20px] p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(163,55,87,0.10)', color: '#A33757' }}>
            <UserRound size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-[750] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Client</p>
            <p className="truncate text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>{clientName || 'Client'}</p>
          </div>
          {assessmentNumber ? (
            <span className="ml-auto shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[750]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              #{assessmentNumber}
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <AssessmentDateField value={form.assessmentDate} onChange={(v) => set('assessmentDate', v)} />
          <FormField label="Assessment type" required>
            <SelectInput
              value={form.assessmentType}
              onChange={(e) => set('assessmentType', e.target.value as AssessmentType)}
            >
              {ASSESSMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </SelectInput>
          </FormField>
        </div>
      </section>

      <section className="rounded-[20px] p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <History size={15} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] font-[750] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Previous assessment</p>
            <p className="mt-0.5 text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{previousLabel(previous)}</p>
            {previous && (
              <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                The new assessment is compared against this record. Leaving a finding unselected later will be shown as “not recorded”, never as resolved.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-3" style={{ background: 'rgba(163,55,87,0.05)', border: '1px solid rgba(163,55,87,0.14)' }}>
        <CalendarDays size={14} style={{ color: '#A33757', flexShrink: 0, marginTop: 2 }} />
        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          A draft can be saved at any point and continued later. Completing the assessment marks it finished in the client's history; it can still be reopened and corrected.
        </p>
      </div>
    </div>
  );
}

export default StepAssessmentOverview;
