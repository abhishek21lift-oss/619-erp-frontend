'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, FileSignature } from 'lucide-react';
import SignaturePad from '@/components/pt-os/shared/SignaturePad';
import type { ParqFormData, ConsentCheckboxesForm } from './types';
import { CONSENT_CHECKBOX_FIELDS } from './types';

interface StepConsentProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
  stepLabel: string;
  /** Editing a signed screening whose answers have changed: the signature on
   *  file attests to the old answers, so the client signs again. */
  resignRequired?: boolean;
}

export function StepConsent({ form, set, error, stepLabel, resignRequired }: StepConsentProps) {
  const [userAgent, setUserAgent] = useState('');
  useEffect(() => { if (typeof navigator !== 'undefined') setUserAgent(navigator.userAgent); }, []);

  const toggleCheckbox = (key: keyof ConsentCheckboxesForm) => {
    set('consentCheckboxes', { ...form.consentCheckboxes, [key]: !form.consentCheckboxes[key] });
  };
  const allChecked = CONSENT_CHECKBOX_FIELDS.every((f) => form.consentCheckboxes[f.key]);

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <FileSignature size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Digital Consent</h2>
            <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">{stepLabel} — the client confirms these answers and signs.</p>
          </div>
        </div>

        {/* Risk, voluntary participation, emergency care and data use are
            agreed on the Informed Consent. They were asked here as well, so
            the client ticked and signed the same statements twice. */}
        {resignRequired && (
          <div className="flex items-start gap-3 rounded-[14px] p-4" style={{ background: 'rgba(217,119,6,0.10)', border: '1px solid rgba(217,119,6,0.35)' }} role="status">
            <AlertTriangle size={17} className="mt-0.5 flex-shrink-0" style={{ color: '#d97706' }} aria-hidden />
            <p className="text-[13px] font-[600] leading-snug" style={{ color: 'var(--text-primary)' }}>
              Answers changed since this screening was signed. The client must confirm and sign again — the new signature and PDF replace the old ones.
            </p>
          </div>
        )}

        <div className="space-y-2.5">
          {CONSENT_CHECKBOX_FIELDS.map((f) => {
            const checked = form.consentCheckboxes[f.key];
            return (
              <button
                key={f.key} type="button" onClick={() => toggleCheckbox(f.key)}
                className="flex w-full items-start gap-3 rounded-[14px] px-4 py-3.5 text-left transition-all"
                style={{ background: checked ? 'rgba(0,103,224,0.05)' : 'var(--bg-subtle)', border: checked ? '1.5px solid #0067E0' : '1.5px solid var(--border)' }}
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]" style={{ background: checked ? '#0067E0' : 'var(--bg-card)', border: checked ? 'none' : '1.5px solid var(--border-2)' }}>
                  {checked && <Check size={13} color="#fff" strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-[600] leading-snug" style={{ color: checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{f.label}</span>
              </button>
            );
          })}
          {!allChecked && (
            <p className="text-[11.5px] font-[600]" style={{ color: '#d97706' }}>The client must confirm their answers before signing.</p>
          )}
        </div>

        <div className="sm:max-w-[520px]">
          <SignaturePad label="Client Signature" required value={form.clientSignature} onChange={(v) => set('clientSignature', v)} />
        </div>

        {userAgent && (
          <p className="text-[10.5px] font-[550]" style={{ color: 'var(--border-2)' }}>
            Device recorded for this consent: {userAgent}
          </p>
        )}

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepConsent;
