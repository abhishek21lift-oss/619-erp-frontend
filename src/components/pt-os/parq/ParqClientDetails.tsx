'use client';

import { UserRound } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { ParqFormData } from './types';

interface ParqClientDetailsProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
}

/**
 * Who this screening is for, and who to call. The details were copied from
 * the client profile without ever being shown, and a medical screening
 * never asked for an emergency contact at all.
 */
export function ParqClientDetails({ form, set }: ParqClientDetailsProps) {
  return (
    <div className="rounded-[16px] p-5 space-y-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <UserRound size={15} style={{ color: 'var(--text-muted)' }} aria-hidden />
        <p className="text-[12px] font-[700] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Client details</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
        {([['Name', form.fullName], ['Mobile', form.mobile], ['Date of birth', form.dob], ['Email', form.email]] as const).map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt style={{ color: 'var(--text-muted)' }}>{k}</dt>
            <dd className="truncate font-[650]" style={{ color: 'var(--text-primary)' }}>{v || '—'}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FloatInput label="Emergency contact name" maxLength={255} value={form.emergencyContact} onChange={(v) => set('emergencyContact', v)} />
        <FloatInput label="Emergency contact phone" type="tel" maxLength={20} value={form.emergencyPhone} onChange={(v) => set('emergencyPhone', v)} />
        <FloatInput label="Height (cm)" numeric="decimal" value={form.heightCm} onChange={(v) => set('heightCm', v)} />
        <FloatInput label="Weight (kg)" numeric="decimal" value={form.weightKg} onChange={(v) => set('weightKg', v)} />
      </div>
    </div>
  );
}

export default ParqClientDetails;
