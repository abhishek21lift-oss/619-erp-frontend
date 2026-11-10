import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import AssessmentInfoCard from '@/components/pt-os/fitness-testing/AssessmentInfoCard';
import { initAssessmentForm } from '@/components/pt-os/fitness-testing/types';

it('shows client and number as read-only text, not disabled inputs', () => {
  render(<AssessmentInfoCard form={initAssessmentForm()} set={() => {}} clientName="Sarah Mitchell" nextAssessmentNumber={7} />);
  expect(screen.getByText('Sarah Mitchell')).toBeTruthy();
  expect(screen.getByText('7')).toBeTruthy();
  expect(screen.queryByLabelText('Client Name')).toBeNull();
  expect(screen.queryByLabelText('Assessment Number')).toBeNull();
});
