import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import StepCardio from '@/components/pt-os/fitness-testing/StepCardio';
import { initAssessmentForm } from '@/components/pt-os/fitness-testing/types';

function Harness() {
  const [form, setForm] = useState(initAssessmentForm());
  return <StepCardio form={form} set={(k, v) => setForm((f) => ({ ...f, [k]: v }))} age={34} gender="Female" />;
}

it('renders six test cards and selects one', () => {
  render(<Harness />);
  expect(screen.getAllByRole('radio')).toHaveLength(6);
  fireEvent.click(screen.getByRole('radio', { name: 'YMCA 3-Minute Step Test' }));
  expect(screen.getByRole('radio', { name: 'YMCA 3-Minute Step Test' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByLabelText('Recovery Heart Rate (bpm)')).toBeTruthy();
});

it('swaps the fields and the result when the test changes', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('radio', { name: 'Rockport 1-Mile Walk' }));
  expect(screen.getByLabelText('Heart Rate at Finish (bpm)')).toBeTruthy();
  expect(screen.queryByLabelText('Recovery Heart Rate (bpm)')).toBeNull();
  fireEvent.change(screen.getByLabelText('Completion Time (min)'), { target: { value: '14.5' } });
  expect(screen.getByLabelText('Completion Time (min)')).toHaveValue('14.5');
});
