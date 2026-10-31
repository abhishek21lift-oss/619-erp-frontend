// Medical conditions and notes were stored but never shown, and a trainer who
// cleared them kept the old values: the payload dropped a blank field instead
// of sending null. Nutrition no longer asks for alcohol — Lifestyle owns it.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import StepContext from '@/components/pt-os/nutrition-assessment/StepContext';
import { initNutritionForm } from '@/components/pt-os/nutrition-assessment/types';

describe('medical context', () => {
  it('shows the conditions and notes on the form', () => {
    const set = vi.fn();
    render(<StepContext form={initNutritionForm()} set={set} />);

    expect(screen.getByText('Medical Conditions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Diabetes' }));
    expect(set).toHaveBeenCalledWith('medicalConditions', ['Diabetes']);
    expect(screen.getByLabelText('Medical notes')).toBeInTheDocument();
  });

  it('sends null when cleared, and leaves alcohol to Lifestyle', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(chrome)/pt-os/nutrition-assessment/page.tsx'), 'utf8',
    );
    const submit = src.slice(src.indexOf('const payload'), src.indexOf('if (assessmentId)'));

    expect(submit).toContain('medical_conditions: form.medicalConditions.length ? form.medicalConditions : null');
    expect(submit).toContain('medical_notes: form.medicalNotes || null');
    expect(submit).not.toContain('alcoholic_drinks_per_week');
  });
});
