'use client';

import { FileSignature } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SignaturePad from '@/components/pt-os/shared/SignaturePad';
import type { InformedConsentFormData } from './types';

interface StepSignaturesProps {
  form: InformedConsentFormData;
  set: <K extends keyof InformedConsentFormData>(key: K, val: InformedConsentFormData[K]) => void;
  error?: string;
}

export function StepSignatures({ form, set, error }: StepSignaturesProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <FileSignature size={20} color="#F59E0B" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Digital Signatures</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 4 of 4 — client and trainer signatures are required.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <SignaturePad label="Client Signature" onChange={(v) => set('clientSignature', v)} />
        <SignaturePad label="Trainer Signature" onChange={(v) => set('trainerSignature', v)} />
      </div>

      <div className="space-y-3">
        <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Witness (optional)</p>
        <FloatInput label="Witness Name" value={form.witnessName} onChange={(v) => set('witnessName', v)} />
        <SignaturePad label="Witness Signature" onChange={(v) => set('witnessSignature', v)} />
      </div>

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export default StepSignatures;
