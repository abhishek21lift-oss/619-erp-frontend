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
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0d9488,#0f766e)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f766e' }}>
            <FileSignature size={20} color="#fff" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Exercise Programme Consent</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 6 of 7</p>
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
            background: form.exerciseConsentChecked ? 'rgba(13,148,136,0.06)' : 'var(--bg-subtle)',
            border: form.exerciseConsentChecked ? '1.5px solid #0d9488' : '1.5px solid rgba(15,23,42,0.08)',
          }}>
          <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]"
            style={{ background: form.exerciseConsentChecked ? '#0d9488' : '#fff', border: form.exerciseConsentChecked ? 'none' : '1.5px solid #cbd5e1' }}>
            {form.exerciseConsentChecked && <Check size={13} color="#fff" strokeWidth={3} />}
          </span>
          <span className="text-[13px] font-[600] leading-snug" style={{ color: form.exerciseConsentChecked ? '#0f172a' : '#475569' }}>
            {EXERCISE_PROGRAMME_CHECKBOX_LABEL}
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <SignaturePad label="Client signature" onChange={(v) => set('exerciseConsentSignature', v)} />
          <FloatInput label="Date" type="date" value={form.exerciseConsentDate} onChange={(v) => set('exerciseConsentDate', v)} required />
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepExerciseProgrammeConsent;
