'use client';

import { Check, AlertTriangle } from 'lucide-react';
import type { InformedConsentFormData } from './types';
import { RISK_ACK_FIELDS } from './types';
import type { InformedConsentAcknowledgements } from '@/lib/api';

const RISKS = [
  'Muscle soreness', 'Muscle strain', 'Joint discomfort', 'Elevated heart rate',
  'Blood pressure changes', 'Fatigue', 'Dizziness', 'Falls', 'Injury',
];

interface StepRisksResponsibilitiesProps {
  form: InformedConsentFormData;
  set: <K extends keyof InformedConsentFormData>(key: K, val: InformedConsentFormData[K]) => void;
  error?: string;
}

export function StepRisksResponsibilities({ form, set, error }: StepRisksResponsibilitiesProps) {
  const toggle = (key: keyof InformedConsentAcknowledgements) => {
    set('acknowledgements', { ...form.acknowledgements, [key]: !form.acknowledgements[key] });
  };

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#dc2626,#991b1b)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#991b1b' }}>
            <AlertTriangle size={20} color="#fff" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Potential Risks & Your Responsibilities</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 6 — all items must be checked to continue.</p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
            Potential risks of personal training
          </p>
          <div className="flex flex-wrap gap-2">
            {RISKS.map((r) => (
              <span key={r} className="rounded-full px-3 py-1.5 text-[12px] font-[650]" style={{ background: 'rgba(220,38,38,0.06)', color: '#991b1b', border: '1px solid rgba(220,38,38,0.15)' }}>
                {r}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {RISK_ACK_FIELDS.map((f) => {
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

export default StepRisksResponsibilities;
