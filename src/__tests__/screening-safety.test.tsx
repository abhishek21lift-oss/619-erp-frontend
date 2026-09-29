// Screening safety fixes (system audit 2026-09-29).
//
// The PAR-Q and Informed Consent are what let a client train. These pin the
// client-side half of the fixes; the backend repeats every rule that matters.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, renderHook } from '@testing-library/react';
import StepExerciseProgrammeConsent from '@/components/pt-os/informed-consent/StepExerciseProgrammeConsent';
import ConsentSummary from '@/components/pt-os/informed-consent/ConsentSummary';
import {
  amendFormFromRecord, buildUpdatePayload, initInformedConsentForm, validateStep, FINAL_ACK_FIELDS,
} from '@/components/pt-os/informed-consent/types';
import type { InformedConsentFormData } from '@/components/pt-os/informed-consent/types';
import { latestScreened, screeningIssues } from '@/components/pt-os/parq/ScreeningNotice';
import { useAutoSaveDraft } from '@/hooks/useAutoSaveDraft';
import type { InformedConsent, ParqForm } from '@/lib/api';

vi.mock('@/components/pt-os/shared/SignaturePad', () => ({
  default: ({ label }: { label: string }) => <div data-testid="signature-pad">{label}</div>,
}));

const form = (over: Partial<InformedConsentFormData> = {}): InformedConsentFormData => ({
  ...initInformedConsentForm(), exerciseConsentChecked: true, ...over,
});

const record = (over: Partial<InformedConsent> = {}): InformedConsent => ({
  id: 'ic-1', client_id: 'c1', status: 'completed', version: 1, full_name: 'Mina Rao',
  acknowledgements: { understands_confidentiality: true, voluntary_participation: true, final_declaration: true },
  exercise_consent_checked: true, client_signature: 'data:a', trainer_signature: 'data:b',
  witness_signature: 'data:w', witness_name: 'Ravi', created_at: '2026-09-01T00:00:00Z',
  ...over,
} as InformedConsent);

describe('consent — has a doctor advised against exercise?', () => {
  it('step 1 asks the question and will not move on until it is answered', () => {
    render(<StepExerciseProgrammeConsent form={form()} set={vi.fn()} />);
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    expect(validateStep(1, form())).toMatch(/doctor has advised/i);
    expect(validateStep(1, form({ physicianAdvisedAgainst: false }))).toBeUndefined();
  });

  it('a "yes" needs the condition, and says training stays blocked', () => {
    render(<StepExerciseProgrammeConsent form={form({ physicianAdvisedAgainst: true })} set={vi.fn()} />);
    expect(screen.getByText(/Training stays blocked until a medical clearance/i)).toBeTruthy();
    expect(validateStep(1, form({ physicianAdvisedAgainst: true }))).toMatch(/condition/i);
    expect(validateStep(1, form({ physicianAdvisedAgainst: true, medicalCondition: 'Arrhythmia' }))).toBeUndefined();
  });

  it('choosing an answer sets it', () => {
    const set = vi.fn();
    render(<StepExerciseProgrammeConsent form={form()} set={set} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    expect(set).toHaveBeenCalledWith('physicianAdvisedAgainst', true);
  });

  it('the answer reaches the record; an unanswered question sends nothing', () => {
    expect(buildUpdatePayload(form())).not.toHaveProperty('physician_advised_against');
    expect(buildUpdatePayload(form({ physicianAdvisedAgainst: true, medicalCondition: ' Arrhythmia ', physicianName: 'Dr Rao' })))
      .toMatchObject({ physician_advised_against: true, medical_condition: 'Arrhythmia', physician_name: 'Dr Rao' });
    // A "no" clears any details left over from a "yes".
    expect(buildUpdatePayload(form({ physicianAdvisedAgainst: false, medicalCondition: 'stale' })))
      .toMatchObject({ physician_advised_against: false, medical_condition: null });
  });
});

describe('consent — amending', () => {
  it('carries the details over but asks for every agreement and signature again', () => {
    const f = amendFormFromRecord(record({ physician_advised_against: false }));
    expect(f.fullName).toBe('Mina Rao');
    expect(f.physicianAdvisedAgainst).toBe(false);
    expect(f.exerciseConsentChecked).toBe(false);
    expect(f.acknowledgements).toEqual({});
    expect([f.clientSignature, f.trainerSignature, f.witnessSignature, f.witnessName]).toEqual(['', '', '', '']);
  });
});

describe('consent summary', () => {
  const noop = () => {};
  const summary = (r: InformedConsent, onUploadClearance = vi.fn(async () => {})) => render(
    <ConsentSummary clientName="Mina" record={r} history={[r]} onAmend={noop} onContinue={noop}
      onDownload={noop} onPrint={noop} onUploadClearance={onUploadClearance} />,
  );

  it('counts the agreements the wizard actually asks for', () => {
    summary(record());
    expect(screen.getByText(`${FINAL_ACK_FIELDS.length} of ${FINAL_ACK_FIELDS.length}`)).toBeTruthy();
    expect(screen.queryByText(/outstanding/)).toBeNull();
  });

  it('offers the clearance upload only while one is owed', () => {
    summary(record({ physician_advised_against: true, medical_clearance_file_url: null }));
    expect(screen.getByText(/Upload medical clearance/)).toBeTruthy();
  });

  it('no upload once the clearance is on file', () => {
    summary(record({ physician_advised_against: true, medical_clearance_file_url: '/u/c.pdf' }));
    expect(screen.queryByText(/Upload medical clearance/)).toBeNull();
  });
});

describe('PAR-Q — what the gate will warn about', () => {
  const all = (yes: number[] = []) => Array.from({ length: 10 }, (_, i) => ({
    question_id: i + 1, answer: yes.includes(i + 1) ? 'yes' : 'no',
  }));
  const parq = (over: Partial<ParqForm> = {}): ParqForm => ({
    id: 'f1', client_id: 'c1', assessment_date: '2026-09-01', status: 'submitted', risk_level: 'low',
    parq_answers: all(), ...over,
  } as ParqForm);
  const now = new Date('2026-09-29T00:00:00Z');

  it('a clean, current, low-risk screening raises nothing', () => {
    expect(screeningIssues(parq(), now)).toEqual([]);
  });

  it('a "submitted" screening with blank answers is incomplete', () => {
    expect(screeningIssues(parq({ parq_answers: [] }), now)).toEqual([{ kind: 'incomplete', answered: 0 }]);
  });

  it('medium risk needs review until it is marked reviewed', () => {
    expect(screeningIssues(parq({ risk_level: 'medium', parq_answers: all([2]) as ParqForm['parq_answers'] }), now))
      .toEqual([{ kind: 'review' }]);
    expect(screeningIssues(parq({ risk_level: 'medium', status: 'reviewed' }), now)).toEqual([]);
  });

  it('over a year old is due a re-screen', () => {
    expect(screeningIssues(parq({ assessment_date: '2025-09-01' }), now)).toEqual([{ kind: 'stale' }]);
  });

  it('reads the latest non-draft screening, as the gate does', () => {
    const forms = [
      parq({ id: 'draft', status: 'draft', assessment_date: '2026-09-20' }),
      parq({ id: 'old', assessment_date: '2026-01-01' }),
      parq({ id: 'new', assessment_date: '2026-09-10' }),
    ];
    expect(latestScreened(forms)?.id).toBe('new');
    expect(latestScreened([parq({ status: 'draft' })])).toBeNull();
  });
});

describe('local drafts never overwrite newer server data', () => {
  beforeEach(() => localStorage.clear());

  it('a draft written before the server copy was saved is ignored', () => {
    localStorage.setItem('k', JSON.stringify({ data: { a: 1 }, savedAt: 1_000 }));
    const { result } = renderHook(() => useAutoSaveDraft({ key: 'k', data: {}, isDirty: false }));
    expect(result.current.restore({ notBefore: 2_000 })).toBeNull();
    expect(result.current.restore({ notBefore: 500 })).toEqual({ a: 1 });
    expect(result.current.restore()).toEqual({ a: 1 });
  });
});
