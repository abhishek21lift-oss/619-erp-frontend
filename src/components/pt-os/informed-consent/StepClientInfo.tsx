'use client';

import { User } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { InformedConsentFormData } from './types';

interface StepClientInfoProps {
  form: InformedConsentFormData;
  set: <K extends keyof InformedConsentFormData>(key: K, val: InformedConsentFormData[K]) => void;
  error?: string;
}

export function StepClientInfo({ form, set, error }: StepClientInfoProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <User size={20} color="#F59E0B" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Client Information</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 4 — auto-filled from the client profile, edit if anything has changed.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Full Name" value={form.fullName} onChange={(v) => set('fullName', v)} required />
        <FloatInput label="Gender" value={form.gender} onChange={(v) => set('gender', v)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} required />
        <FloatInput label="Mobile Number" value={form.mobile} onChange={(v) => set('mobile', v)} required />
      </div>
      <FloatInput label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Emergency Contact" value={form.emergencyContact} onChange={(v) => set('emergencyContact', v)} />
        <FloatInput label="Emergency Number" value={form.emergencyPhone} onChange={(v) => set('emergencyPhone', v)} />
      </div>
      <FloatInput label="Address" value={form.address} onChange={(v) => set('address', v)} multiline autoGrow />
      <FloatInput label="Occupation" value={form.occupation} onChange={(v) => set('occupation', v)} />

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}

export default StepClientInfo;
