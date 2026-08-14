'use client';

import { Check, FileSignature } from 'lucide-react';
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
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Consent</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 3</p>
        </div>
      </div>

      {/* Verbatim consent text card */}
      <div className="rounded-[16px] p-5 sm:p-6 space-y-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
        {EXERCISE_PROGRAMME_CONSENT_PARAGRAPHS.map((para, i) => (
          <p key={i} className="text-[13.5px] leading-relaxed text-slate-700">{para}</p>
        ))}
      </div>

      {/* Mandatory checkbox — exact wording */}
      <button
        type="button" onClick={() => set('exerciseConsentChecked', !form.exerciseConsentChecked)}
        className="flex w-full items-start gap-3 rounded-[14px] px-4 py-3.5 text-left transition-all"
        style={{
          background: form.exerciseConsentChecked ? 'rgba(0,89,206,0.06)' : 'var(--bg-subtle)',
          border: form.exerciseConsentChecked ? '1.5px solid #0059ce' : '1.5px solid rgba(15,23,42,0.08)',
        }}>
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]"
          style={{ background: form.exerciseConsentChecked ? '#0059ce' : '#fff', border: form.exerciseConsentChecked ? 'none' : '1.5px solid #cbd5e1' }}>
          {form.exerciseConsentChecked && <Check size={13} color="#fff" strokeWidth={3} />}
        </span>
        <span className="text-[13px] font-[600] leading-snug" style={{ color: form.exerciseConsentChecked ? '#0f172a' : '#475569' }}>
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

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepExerciseProgrammeConsent;
