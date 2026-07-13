'use client';

import { useEffect, useState } from 'react';
import { Check, FileSignature, MapPin } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SignaturePad from '@/components/pt-os/shared/SignaturePad';
import type { ParqFormData, ConsentCheckboxesForm } from './types';
import { CONSENT_CHECKBOX_FIELDS } from './types';

interface StepConsentProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
}

export function StepConsent({ form, set, error }: StepConsentProps) {
  const [userAgent, setUserAgent] = useState('');
  useEffect(() => { if (typeof navigator !== 'undefined') setUserAgent(navigator.userAgent); }, []);

  const toggleCheckbox = (key: keyof ConsentCheckboxesForm) => {
    set('consentCheckboxes', { ...form.consentCheckboxes, [key]: !form.consentCheckboxes[key] });
  };
  const allChecked = CONSENT_CHECKBOX_FIELDS.every((f) => form.consentCheckboxes[f.key]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <FileSignature size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Digital Consent</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 8 of 9 — all boxes must be checked, both signatures required.</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {CONSENT_CHECKBOX_FIELDS.map((f) => {
            const checked = form.consentCheckboxes[f.key];
            return (
              <button
                key={f.key} type="button" onClick={() => toggleCheckbox(f.key)}
                className="flex w-full items-start gap-3 rounded-[14px] px-4 py-3.5 text-left transition-all"
                style={{ background: checked ? 'rgba(245,158,11,0.05)' : 'var(--bg-subtle)', border: checked ? '1.5px solid #F59E0B' : '1.5px solid rgba(15,23,42,0.08)' }}
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px]" style={{ background: checked ? '#F59E0B' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1' }}>
                  {checked && <Check size={13} color="#fff" strokeWidth={3} />}
                </span>
                <span className="text-[13px] font-[600] leading-snug" style={{ color: checked ? '#0f172a' : '#475569' }}>{f.label}</span>
              </button>
            );
          })}
          {!allChecked && (
            <p className="text-[11.5px] font-[600]" style={{ color: '#d97706' }}>All 7 items must be checked before you can continue.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <SignaturePad label="Client Signature" onChange={(v) => set('clientSignature', v)} />
          <SignaturePad label="Trainer Signature" onChange={(v) => set('trainerSignature', v)} />
        </div>

        <FloatInput
          label="Location (optional)" value={form.consentLocation} onChange={(v) => set('consentLocation', v)}
          placeholder="e.g. Gold's Gym, Andheri West" prefix={<MapPin size={14} />}
        />
        {userAgent && (
          <p className="text-[10.5px] font-[550]" style={{ color: '#cbd5e1' }}>
            Device recorded for this consent: {userAgent}
          </p>
        )}

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepConsent;
