'use client';

import { Check, FileSignature } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SignaturePad from '@/components/pt-os/shared/SignaturePad';
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        <SignaturePad label="Client signature" onChange={(v) => set('exerciseConsentSignature', v)} required />
        <FloatInput label="Date" type="date" value={form.exerciseConsentDate} onChange={(v) => set('exerciseConsentDate', v)} required />
      </div>

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export default StepExerciseProgrammeConsent;
