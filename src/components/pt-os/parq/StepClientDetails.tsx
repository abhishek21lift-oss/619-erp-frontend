'use client';

import { useMemo } from 'react';
import { UserRound } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import { calcAge, calcBMI, classifyBMI } from '@/lib/parq-calculations';
import type { ParqFormData } from './types';

const GENDERS = ['Male', 'Female', 'Other'];

const BMI_STYLE: Record<string, { bg: string; color: string }> = {
  Underweight: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  Normal: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  Overweight: { bg: 'rgba(249,115,22,0.14)', color: '#ea580c' },
  Obese: { bg: 'rgba(239,68,68,0.14)', color: '#dc2626' },
};

interface StepClientDetailsProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
}

export function StepClientDetails({ form, set, error }: StepClientDetailsProps) {
  const age = useMemo(() => calcAge(form.dob), [form.dob]);
  const bmi = useMemo(() => calcBMI(parseFloat(form.heightCm) || null, parseFloat(form.weightKg) || null), [form.heightCm, form.weightKg]);
  const bmiCategory = useMemo(() => classifyBMI(bmi), [bmi]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <UserRound size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Client Details</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 1 of 8 — confirm identity &amp; baseline measurements.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Assessment Date" type="date" value={form.assessmentDate} onChange={(v) => set('assessmentDate', v)} required />
          <FloatInput label="Full Name" value={form.fullName} onChange={(v) => set('fullName', v)} required />
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Gender</p>
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => {
              const selected = form.gender === g;
              return (
                <button
                  key={g} type="button" onClick={() => set('gender', g)}
                  className="rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
                  style={{
                    background: selected ? '#0f172a' : '#f8fafc',
                    color: selected ? '#fff' : '#64748b',
                    border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0',
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FloatInput label="Date of Birth" type="date" value={form.dob} onChange={(v) => set('dob', v)} required />
            {age != null && <p className="mt-1.5 text-[11.5px] font-[600]" style={{ color: '#94a3b8' }}>Age: {age} years</p>}
          </div>
          <FloatInput label="Mobile" type="tel" value={form.mobile} onChange={(v) => set('mobile', v)} required />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <FloatInput label="Email" type="email" value={form.email} onChange={(v) => set('email', v)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Emergency Contact Name" value={form.emergencyContact} onChange={(v) => set('emergencyContact', v)} />
          <FloatInput label="Emergency Phone" type="tel" value={form.emergencyPhone} onChange={(v) => set('emergencyPhone', v)} />
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

        {bmi != null && bmiCategory && (
          <div className="flex items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: BMI_STYLE[bmiCategory]?.bg, color: BMI_STYLE[bmiCategory]?.color }}>
              BMI {bmi}
            </span>
            <span className="text-[12.5px] font-[600] text-slate-400">{bmiCategory} · computed live, backend recomputes on save</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepClientDetails;
