'use client';

import { ClipboardList } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import type { AssessmentFormData, AssessmentType } from './types';
import { StepCard } from './StepCard';
import { chapterAccent } from './fitnessTheme';

const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: 'initial', label: 'Initial' },
  { value: 'week_4', label: 'Week 4' },
  { value: 'week_8', label: 'Week 8' },
  { value: 'week_12', label: 'Week 12' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

interface AssessmentInfoCardProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  clientName: string;
  nextAssessmentNumber: number | null;
}

function ReadOnlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10.5px] font-[650] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div
        className="mt-1 flex h-11 items-center truncate rounded-[12px] bg-[var(--bg-subtle)] px-3 text-[14px] font-[600]"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>
    </div>
  );
}

export function AssessmentInfoCard({
  form, set, clientName, nextAssessmentNumber,
}: AssessmentInfoCardProps) {
  return (
    <div className="mb-5">
      <StepCard
        icon={ClipboardList}
        accent={chapterAccent[1]}
        title="Assessment details"
        badge="Auto-filled"
      >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadOnlyValue label="Client" value={clientName} />
        <ReadOnlyValue
          label="Assessment number"
          value={nextAssessmentNumber != null ? String(nextAssessmentNumber) : '—'}
        />

        <FloatInput label="Assessment Date" type="date" value={form.assessmentDate} onChange={(v) => set('assessmentDate', v)} />

        <SearchableSelect
          label="Assessment Type" required allowCustom={false}
          value={form.assessmentType}
          onChange={(v) => set('assessmentType', v as AssessmentType)}
          options={ASSESSMENT_TYPES}
        />
      </div>

      <div className="grid gap-4">
        <FloatInput
          label="Testing conditions (optional)" multiline autoGrow maxLength={500}
          value={form.testingConditions}
          onChange={(v) => set('testingConditions', v)}
        />
        <p className="-mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Time of day, fasted or fed, equipment and hydration. Shown beside the comparison so a changed
          protocol is visible instead of being read as a changed result.
        </p>
        <FloatInput
          label="Assessment Notes" multiline autoGrow maxLength={2000}
          value={form.assessmentNotes}
          onChange={(v) => set('assessmentNotes', v)}
        />
      </div>
      </StepCard>
    </div>
  );
}

export default AssessmentInfoCard;
