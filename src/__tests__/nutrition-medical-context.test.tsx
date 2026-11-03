// Nutrition no longer asks for medical conditions: PAR-Q owns the medical
// record. The step shows a read-only summary of the latest submitted PAR-Q,
// with an old Nutrition list as fallback only when no PAR-Q exists.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import StepContext from '@/components/pt-os/nutrition-assessment/StepContext';
import { COACH_NOTE_FIELDS, initNutritionForm } from '@/components/pt-os/nutrition-assessment/types';
import type { ParqForm } from '@/lib/api/types';

const parq = (overrides: Record<string, unknown> = {}) => ({
  client_id: 'client-1',
  status: 'submitted',
  current_health: {},
  past_history: {},
  parq_answers: [],
  ...overrides,
}) as unknown as ParqForm;

const renderStep = (p: ParqForm | null, legacy: string[] = []) => render(
  <StepContext
    form={initNutritionForm()}
    set={vi.fn()}
    clientId="client-1"
    parq={p}
    legacyMedicalConditions={legacy}
  />,
);

describe('medical context', () => {
  it('asks for medical notes once, not again in coach notes', () => {
    // The top-level column drives the risk score; a second box wrote a
    // different value into coach_notes.medical_notes.
    expect(COACH_NOTE_FIELDS.map((f) => f.key)).not.toContain('medical_notes');
    // The old stored value still round-trips through the form shape.
    expect(initNutritionForm().coachNotes.medical_notes).toBe('');
  });

  it('shows the PAR-Q conditions read-only and keeps the notes editable', () => {
    const set = vi.fn();
    render(
      <StepContext
        form={initNutritionForm()}
        set={set}
        clientId="client-1"
        parq={parq({ past_history: { heart_disease: true } })}
        legacyMedicalConditions={['Asthma']}
      />,
    );

    expect(screen.getByText('Medical Conditions')).toBeInTheDocument();
    expect(screen.getByText('Heart disease')).toBeInTheDocument();
    // The owner answers, so the legacy list is not shown.
    expect(screen.queryByText('Asthma')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Medical notes'), { target: { value: 'Managed asthma' } });
    expect(set).toHaveBeenCalledWith('medicalNotes', 'Managed asthma');
  });

  it('shows a legacy Nutrition list only when no submitted PAR-Q exists', () => {
    renderStep(null, ['Asthma', 'None']);
    expect(screen.getByText('Asthma')).toBeInTheDocument();
    expect(screen.queryByText('None')).not.toBeInTheDocument();
  });

  it('says so when there is no PAR-Q and no legacy answer', () => {
    renderStep(null);
    expect(screen.getByText('No submitted PAR-Q on file.')).toBeInTheDocument();
  });

  it('sends the notes, never the assigned condition list', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/(chrome)/pt-os/nutrition-assessment/page.tsx'), 'utf8',
    );
    const submit = src.slice(src.indexOf('const payload'), src.indexOf('if (assessmentId)'));

    expect(submit).not.toContain('medical_conditions');
    expect(submit).toContain('medical_notes: form.medicalNotes || null');
    expect(submit).not.toContain('meal_timing_consistency');
    expect(submit).not.toContain('alcoholic_drinks_per_week');
  });
});
