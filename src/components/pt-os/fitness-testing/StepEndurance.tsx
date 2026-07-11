'use client';

import { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { classifyEndurance } from '@/lib/fitness-calculations';
import type { Gender } from '@/lib/fitness-calculations';
import type { AssessmentFormData, EnduranceTestType } from './types';
import { n } from './types';

const ENDURANCE_TESTS: EnduranceTestType[] = ['Push Up Test', 'Curl Up Test', 'Wall Sit', 'Plank', 'Bodyweight Squat', 'Custom'];

interface StepEnduranceProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  gender: Gender | null;
  error?: string;
}

export function StepEndurance({ form, set, gender, error }: StepEnduranceProps) {
  const value = form.enduranceValueType === 'reps' ? n(form.enduranceReps) : n(form.enduranceDurationSec);
  const category = useMemo(
    () => classifyEndurance(form.enduranceTestType || null, value, gender),
    [form.enduranceTestType, value, gender],
  );

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Repeat size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Muscular Endurance</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 6 of 7 — sustained effort test.</p>
          </div>
        </div>

        <div className="mb-5">
          <SearchableSelect
            label="Test" required allowCustom={false}
            value={form.enduranceTestType}
            onChange={(v) => {
              const test = v as EnduranceTestType;
              set('enduranceTestType', test);
              set('enduranceValueType', test === 'Push Up Test' || test === 'Curl Up Test' ? 'reps' : 'time');
            }}
            options={ENDURANCE_TESTS}
          />
        </div>

        {form.enduranceTestType === 'Push Up Test' || form.enduranceTestType === 'Curl Up Test' ? (
          <FloatInput label="Repetitions Completed" type="number" value={form.enduranceReps} onChange={(v) => set('enduranceReps', v)} />
        ) : form.enduranceTestType ? (
          <FloatInput label="Duration Held (sec)" type="number" value={form.enduranceDurationSec} onChange={(v) => set('enduranceDurationSec', v)} />
        ) : null}

        {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

        {category && (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[16px] p-4" style={{ background: 'var(--bg-subtle)' }}>
            <div>
              <p className="text-[10.5px] font-[700] uppercase tracking-wider text-slate-400">
                {form.enduranceValueType === 'reps' ? 'Repetitions' : 'Duration'}
              </p>
              <p className="text-[18px] font-[800] text-slate-900">
                {value ?? '—'} {form.enduranceValueType === 'reps' ? 'reps' : 'sec'}
              </p>
            </div>
            <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
              {category}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default StepEndurance;
