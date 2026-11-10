import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import StepBloodPressure from '@/components/pt-os/fitness-testing/StepBloodPressure';
import { initAssessmentForm } from '@/components/pt-os/fitness-testing/types';

function Harness() {
  const [form, setForm] = useState({ ...initAssessmentForm(), bpSystolic: '118', bpDiastolic: '76', restingHeartRate: '62', restingSpo2: '98' });
  return <StepBloodPressure form={form} set={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />;
}

it('keeps the accessible field names and shows the classification inline', () => {
  render(<Harness />);
  expect(screen.getByLabelText('Systolic (mmHg)')).toHaveValue('118');
  expect(screen.getAllByText('Normal').length).toBeGreaterThan(0);
});

it('clamps numeric hero input instead of accepting letters', () => {
  render(<Harness />);
  const systolic = screen.getByLabelText('Systolic (mmHg)');
  fireEvent.change(systolic, { target: { value: '12a0.5' } });
  expect(systolic).toHaveValue('1205');
});

it('toggles the not-measured confirmation as a switch', () => {
  const set = vi.fn();
  render(<StepBloodPressure form={initAssessmentForm()} set={set} />);
  fireEvent.click(screen.getByRole('switch'));
  expect(set).toHaveBeenCalledWith('bpNotMeasured', true);
});

it('renders the step error without hiding the fields', () => {
  render(<StepBloodPressure form={initAssessmentForm()} set={() => {}} error="Enter the resting blood pressure" />);
  expect(screen.getByText('Enter the resting blood pressure')).toBeTruthy();
  expect(screen.getByLabelText('Systolic (mmHg)')).toBeTruthy();
});
