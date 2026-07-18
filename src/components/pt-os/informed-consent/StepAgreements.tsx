'use client';

import { Check, ShieldCheck } from 'lucide-react';
import type { InformedConsentFormData } from './types';
import { FINAL_ACK_FIELDS } from './types';
import type { InformedConsentAcknowledgements } from '@/lib/api';

interface StepAgreementsProps {
  form: InformedConsentFormData;
  set: <K extends keyof InformedConsentFormData>(key: K, val: InformedConsentFormData[K]) => void;
  error?: string;
}

export function StepAgreements({ form, set, error }: StepAgreementsProps) {
  const toggle = (key: keyof InformedConsentAcknowledgements) => {
    set('acknowledgements', { ...form.acknowledgements, [key]: !form.acknowledgements[key] });
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <ShieldCheck size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Confidentiality, Participation & Declaration</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 4 — all items must be checked to continue.</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {FINAL_ACK_FIELDS.map((f) => {
            const checked = Boolean(form.acknowledgements[f.key]);
            return (
              <button
                key={f.key} type="button" onClick={() => toggle(f.key)}
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
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepAgreements;
