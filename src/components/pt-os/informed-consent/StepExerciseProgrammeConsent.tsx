'use client';

import { AlertTriangle, Check, FileSignature } from 'lucide-react';
import type { InformedConsentFormData } from './types';
import { EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS, EXERCISE_PROGRAMME_CHECKBOX_LABEL } from './types';

interface StepExerciseProgrammeConsentProps {
  form: InformedConsentFormData;
  set: <K extends keyof InformedConsentFormData>(key: K, val: InformedConsentFormData[K]) => void;
  error?: string;
}

// Verbatim consent text (see EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS in
// ./types.ts) — do not edit the wording here or anywhere else.
export function StepExerciseProgrammeConsent({ form, set, error }: StepExerciseProgrammeConsentProps) {
  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0059ce' }}>
          <FileSignature size={20} color="#fff" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Consent</h2>
          <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">Step 1 of 3</p>
        </div>
      </div>

      {/* The client's identity is not shown here. It is read from the client
          profile onto the signed record — full_name, gender, dob, mobile,
          email, emergency contact, emergency phone, address, occupation — and
          the profile is where it is edited, so the consent never held a second,
          diverging copy of it on screen.

          The values are still LOADED and still SAVED: this is a display
          removal only. initInformedConsentForm + the page's profile autofill
          fill the fields, buildCreatePayload/buildUpdatePayload send them, and
          the columns on pt_informed_consents and the PDF are untouched, so
          every existing record keeps its data. Removing the inputs earlier
          (55f09d7d) had already left nothing editable here to display. */}

      {/* Verbatim consent text card */}
      <div className="rounded-[16px] p-5 sm:p-6 space-y-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        {EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS.map((para, i) => (
          <p key={i} className="text-[13.5px] leading-relaxed text-[color:var(--text-secondary)]">{para}</p>
        ))}
      </div>

      {/* Mandatory checkbox — exact wording */}
      <button
        type="button" onClick={() => set('exerciseConsentChecked', !form.exerciseConsentChecked)}
        className="flex w-full items-start gap-3 rounded-[14px] px-4 py-3.5 text-left transition-all"
        style={{
          background: form.exerciseConsentChecked ? 'rgba(0,89,206,0.06)' : 'var(--bg-subtle)',
          border: form.exerciseConsentChecked ? '1.5px solid #0059ce' : '1.5px solid var(--border)',
        }}>
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]"
          style={{ background: form.exerciseConsentChecked ? '#0059ce' : 'var(--bg-card)', border: form.exerciseConsentChecked ? 'none' : '1.5px solid var(--border-2)' }}>
          {form.exerciseConsentChecked && <Check size={13} color="#fff" strokeWidth={3} />}
        </span>
        <span className="text-[13px] font-[600] leading-snug" style={{ color: form.exerciseConsentChecked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {EXERCISE_PROGRAMME_CHECKBOX_LABEL}
          <span className="ml-0.5 text-[var(--gold,#0067E0)]" aria-hidden>*</span>
        </span>
      </button>

      {/* No signature pad and no date field here any more.
          The wizard is Consent → Agreement → Signature, and step 3 is the step
          named after signing. Asking the client to sign on step 1 meant they
          signed the consent, then read the agreement, then signed again — two
          signatures for one document, the first of them given before the
          client had seen everything they were agreeing to.
          The date moved with it: it is the date the document was signed, so it
          belongs beside the signature that dates it.
          The record still carries exercise_consent_signature and
          exercise_consent_date; buildUpdatePayload now fills both from the
          step-3 signature and date, so the PDF's Exercise Programme Consent
          block is unchanged. */}

      <PhysicianAdvice form={form} set={set} />

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

/**
 * "Has a doctor advised against exercise?"
 *
 * The record and the screening gate have always carried this answer — a "yes"
 * with no clearance on file stops training outright — but nothing in the app
 * ever asked it, so the stop could never fire. It sits beside the paragraph
 * that commits the client to getting written permission when it is needed.
 */
function PhysicianAdvice({ form, set }: Pick<StepExerciseProgrammeConsentProps, 'form' | 'set'>) {
  const answer = form.physicianAdvisedAgainst;
  const option = (value: boolean, label: string) => {
    const on = answer === value;
    return (
      <button
        type="button" role="radio" aria-checked={on}
        onClick={() => set('physicianAdvisedAgainst', value)}
        className="min-h-[44px] flex-1 rounded-[12px] px-4 text-[13px] font-[700] transition-all"
        style={{
          background: on ? (value ? 'rgba(220,38,38,0.08)' : 'rgba(0,89,206,0.06)') : 'var(--bg-subtle)',
          border: on ? `1.5px solid ${value ? '#dc2626' : '#0059ce'}` : '1.5px solid var(--border)',
          color: on ? (value ? '#dc2626' : '#0f172a') : 'var(--text-secondary)',
        }}
      >
        {label}
      </button>
    );
  };
  const field = (key: 'physicianName' | 'physicianHospital' | 'medicalCondition', label: string, required = false) => (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-[650] text-[color:var(--text-secondary)]">
        {label}{required && <span className="ml-0.5 text-[var(--gold,#0067E0)]" aria-hidden>*</span>}
      </span>
      <input
        value={form[key]} onChange={(e) => set(key, e.target.value)} maxLength={key === 'medicalCondition' ? 1000 : 255}
        required={required}
        className="h-[44px] w-full rounded-[12px] px-3.5 text-[14px] outline-none"
        style={{ background: 'var(--bg-card)', border: '1.5px solid rgba(15,23,42,0.1)', color: 'var(--text-primary)' }}
      />
    </label>
  );

  return (
    <div className="rounded-[16px] p-4 sm:p-5 space-y-3.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <p id="physician-advice-q" className="text-[13px] font-[700] text-[color:var(--text-primary)]">
        Has a doctor ever advised this client against physical activity?
        <span className="ml-0.5 text-[var(--gold,#0067E0)]" aria-hidden>*</span>
      </p>
      <div role="radiogroup" aria-labelledby="physician-advice-q" className="flex gap-2.5">
        {option(false, 'No')}
        {option(true, 'Yes')}
      </div>
      {answer === true && (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-[12px] px-3 py-2.5" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[12.5px] font-[600] leading-snug" style={{ color: '#dc2626' }}>
              Training stays blocked until a medical clearance from the doctor is uploaded to this consent.
            </p>
          </div>
          {field('medicalCondition', 'Condition', true)}
          <div className="grid gap-3 sm:grid-cols-2">
            {field('physicianName', 'Doctor')}
            {field('physicianHospital', 'Hospital / clinic')}
          </div>
        </div>
      )}
    </div>
  );
}

export default StepExerciseProgrammeConsent;
