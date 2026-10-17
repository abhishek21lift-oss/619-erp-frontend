'use client';

import { ClipboardList } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import type { AssessmentFormData, AssessmentType } from './types';
import { gradient, tones } from './fitnessTheme';

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

export function AssessmentInfoCard({
  form, set, clientName, nextAssessmentNumber,
}: AssessmentInfoCardProps) {
  return (
    <div className="mb-5">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] text-white" style={{ background: gradient(tones.sky), boxShadow: `0 12px 26px -13px ${tones.sky.glow}` }}>
          <ClipboardList size={18} />
        </div>
        <div>
          <h2 className="text-[18px] font-[840] tracking-[-0.03em] leading-none" style={{ color: 'var(--text-primary)' }}>Assessment Information</h2>
          <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--text-muted)' }}>Scientific Baseline Performance Assessment</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Client Name" value={clientName} onChange={() => {}} disabled />
        <FloatInput
          label="Assessment Number" value={nextAssessmentNumber != null ? String(nextAssessmentNumber) : ''}
          onChange={() => {}} disabled
        />

        <FloatInput label="Assessment Date" type="date" value={form.assessmentDate} onChange={(v) => set('assessmentDate', v)} />

        <SearchableSelect
          label="Assessment Type" required allowCustom={false}
          value={form.assessmentType}
          onChange={(v) => set('assessmentType', v as AssessmentType)}
          options={ASSESSMENT_TYPES}
        />
      </div>

      <div className="mt-4">
        <FloatInput
          label="Assessment Notes" multiline autoGrow maxLength={2000}
          value={form.assessmentNotes}
          onChange={(v) => set('assessmentNotes', v)}
        />
      </div>
    </div>
  );
}

export default AssessmentInfoCard;
