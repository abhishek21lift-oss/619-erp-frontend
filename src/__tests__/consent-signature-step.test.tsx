// The Informed Consent wizard signs once, on the step called Signature.
//
// The wizard is Consent → Agreement → Signature. Step 1 nonetheless carried a
// signature pad and a date field of its own, so the client signed the consent,
// then read the agreement, then signed again — two signatures for one
// document, the first of them given before the client had seen everything
// they were agreeing to. The date sat with that first signature, dating a
// signature that is no longer taken there.
//
// These tests render the two step components and call the wizard's own
// validation, rather than grepping the files for a `<SignaturePad`. A source
// match cannot tell a rendered field from a commented-out one, and cannot tell
// whether removing the field left the wizard impossible to complete — which is
// the failure that would actually reach a trainer.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StepExerciseProgrammeConsent from '@/components/pt-os/informed-consent/StepExerciseProgrammeConsent';
import StepSignatures from '@/components/pt-os/informed-consent/StepSignatures';
import {
  buildUpdatePayload, initInformedConsentForm, validateStep,
} from '@/components/pt-os/informed-consent/types';
import type { InformedConsentFormData } from '@/components/pt-os/informed-consent/types';

// SignaturePad draws on a canvas, which jsdom does not implement. Replaced by
// a labelled stand-in so "is there a signature pad on this step" stays a real
// DOM question.
vi.mock('@/components/pt-os/shared/SignaturePad', () => ({
  default: ({ label }: { label: string }) => <div data-testid="signature-pad">{label}</div>,
}));

const form = (over: Partial<InformedConsentFormData> = {}): InformedConsentFormData => ({
  ...initInformedConsentForm(),
  ...over,
});

const dateInputs = (c: HTMLElement) => c.querySelectorAll('input[type="date"]');

describe('step 1 — Consent', () => {
  it('asks the client to read and acknowledge, and nothing else', () => {
    const { container } = render(
      <StepExerciseProgrammeConsent form={form()} set={vi.fn()} />,
    );
    expect(screen.queryAllByTestId('signature-pad')).toHaveLength(0);
    expect(dateInputs(container)).toHaveLength(0);
  });

  it('still shows the verbatim consent text and its checkbox', () => {
    // The point of the step. Removing the signature must not remove the thing
    // being consented to.
    render(<StepExerciseProgrammeConsent form={form()} set={vi.fn()} />);
    expect(screen.getByText(/cardiorespiratory system/i)).toBeTruthy();
    expect(screen.getByText(/agree to participate in the exercise programme/i)).toBeTruthy();
  });

  it('is passable once the box is checked — no signature demanded', () => {
    // The regression that would strand a trainer: a field removed from the
    // screen but still required by the step's validation, so Next refuses and
    // there is nothing on the page to fix.
    expect(validateStep(1, form({ exerciseConsentChecked: true }))).toBeUndefined();
  });

  it('still refuses to move on with the box unchecked', () => {
    expect(validateStep(1, form({ exerciseConsentChecked: false }))).toMatch(/acknowledgement/i);
  });
});

describe('step 3 — Signature', () => {
  it('carries the client and trainer pads', () => {
    render(<StepSignatures form={form()} set={vi.fn()} />);
    const labels = screen.getAllByTestId('signature-pad').map((n) => n.textContent);
    expect(labels).toContain('Client Signature');
    expect(labels).toContain('Trainer Signature');
  });

  it('carries the date, which moved here from step 1', () => {
    const { container } = render(<StepSignatures form={form()} set={vi.fn()} />);
    expect(dateInputs(container).length).toBeGreaterThanOrEqual(1);
  });

  it('shows the date already held on the form rather than an empty box', () => {
    const { container } = render(
      <StepSignatures form={form({ exerciseConsentDate: '2026-03-14' })} set={vi.fn()} />,
    );
    expect((dateInputs(container)[0] as HTMLInputElement).value).toBe('2026-03-14');
  });

  it('now requires the date it displays', () => {
    const signed = { clientSignature: 'data:image/png;base64,C', trainerSignature: 'data:image/png;base64,T' };
    expect(validateStep(3, form({ ...signed, exerciseConsentDate: '' }))).toMatch(/date/i);
    expect(validateStep(3, form({ ...signed, exerciseConsentDate: '2026-03-14' }))).toBeUndefined();
  });

  it('still requires both signatures', () => {
    expect(validateStep(3, form({ trainerSignature: 'T' }))).toMatch(/client signature/i);
    expect(validateStep(3, form({ clientSignature: 'C' }))).toMatch(/trainer signature/i);
  });
});

describe('the record still carries an exercise-programme signature', () => {
  // The PDF prints "Client signature (signed …)" under the Exercise Programme
  // Consent section from exercise_consent_signature. Removing the pad that
  // used to fill it must not leave that block blank on the signed document.
  it('fills it from the signature taken on step 3', () => {
    const payload = buildUpdatePayload(form({ clientSignature: 'data:image/png;base64,SIGNED' }));
    expect(payload.exercise_consent_signature).toBe('data:image/png;base64,SIGNED');
  });

  it('keeps the stored signature while the step-3 pad is still blank', () => {
    // persist() runs at the end of EVERY step. Amending a completed consent
    // walks through steps 1 and 2 with an empty pad, and an unguarded
    // `|| null` there would wipe the signature already on the record.
    const payload = buildUpdatePayload(form({
      clientSignature: '',
      exerciseConsentSignature: 'data:image/png;base64,ONFILE',
    }));
    expect(payload.exercise_consent_signature).toBe('data:image/png;base64,ONFILE');
  });

  it('sends null when there has never been a signature', () => {
    const payload = buildUpdatePayload(form());
    expect(payload.exercise_consent_signature).toBeNull();
  });

  it('sends the date along with it, unchanged in shape', () => {
    const payload = buildUpdatePayload(form({ exerciseConsentDate: '2026-03-14' }));
    expect(payload.exercise_consent_date).toBe('2026-03-14');
  });
});
