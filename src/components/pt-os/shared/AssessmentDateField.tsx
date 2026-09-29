'use client';

import FloatInput from '@/components/ui/FloatInput';
import { todayISO } from '@/lib/forms/domain';

interface AssessmentDateFieldProps {
  value: string;
  onChange: (v: string) => void;
}

/**
 * When the assessment was done. Lifestyle, Nutrition, Mobility and Posture had
 * no date field at all: every assessment was dated with the device's UTC day
 * — yesterday, before 5:30 AM in India — and an edit could not correct it.
 */
export function AssessmentDateField({ value, onChange }: AssessmentDateFieldProps) {
  const future = value > todayISO();
  return (
    <div className="sm:max-w-[260px]">
      <FloatInput
        label="Assessment date" type="date" required value={value} onChange={onChange}
        error={future ? 'The assessment date cannot be in the future.' : undefined}
      />
    </div>
  );
}

/** For a step's validation: the same rule the field shows. */
export function assessmentDateIssue(value: string): string | undefined {
  if (!value) return 'Choose the assessment date.';
  return value > todayISO() ? 'The assessment date cannot be in the future.' : undefined;
}

export default AssessmentDateField;
