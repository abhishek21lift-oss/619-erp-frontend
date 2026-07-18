'use client';

import { useMemo } from 'react';
import { Move, AlertTriangle } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import { checkAsymmetry, classifyFlexibilityScore } from '@/lib/fitness-calculations';
import type { AssessmentFormData, FlexibilityTestType } from './types';
import { n } from './types';

const FLEXIBILITY_TESTS: FlexibilityTestType[] = [
  'Sit and Reach', 'Shoulder Reach', 'Hamstring', 'Hip Flexor', 'Ankle Mobility', 'Overhead Squat Mobility', 'Custom',
];

interface StepFlexibilityProps {
  form: AssessmentFormData;
  set: <K extends keyof AssessmentFormData>(key: K, val: AssessmentFormData[K]) => void;
  error?: string;
}

export function StepFlexibility({ form, set, error }: StepFlexibilityProps) {
  const hasAsymmetry = useMemo(
    () => checkAsymmetry(n(form.flexibilityLeft), n(form.flexibilityRight)),
    [form.flexibilityLeft, form.flexibilityRight],
  );
  const category = useMemo(() => classifyFlexibilityScore(n(form.flexibilityScore)), [form.flexibilityScore]);

  return (
    <div>
      <div className="flex items-start gap-4 mb-7">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
          <Move size={20} color="#F59E0B" />
        </div>
        <div>
          <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Flexibility &amp; Mobility</h2>
          <p className="text-[13px] text-slate-400 mt-1.5">Step 7 of 7 — range of motion.</p>
        </div>
      </div>

      <div className="mb-5">
        <SearchableSelect
          label="Test" required allowCustom={false}
          value={form.flexibilityTestType}
          onChange={(v) => set('flexibilityTestType', v as FlexibilityTestType)}
          options={FLEXIBILITY_TESTS}
        />
        {form.flexibilityTestType === 'Custom' && (
          <div className="mt-3">
            <FloatInput label="Custom Test Name" value={form.flexibilityCustomTest} onChange={(v) => set('flexibilityCustomTest', v)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FloatInput label="Left Side (cm)" type="number" value={form.flexibilityLeft} onChange={(v) => set('flexibilityLeft', v)} />
        <FloatInput label="Right Side (cm)" type="number" value={form.flexibilityRight} onChange={(v) => set('flexibilityRight', v)} />
        <FloatInput label="Range of Motion (deg)" type="number" value={form.flexibilityRom} onChange={(v) => set('flexibilityRom', v)} />
        <div>
          <FloatInput label="Composite Score (0-10)" type="number" value={form.flexibilityScore} onChange={(v) => set('flexibilityScore', v)} />
          <p className="mt-1.5 text-[11px] text-slate-400">Trainer-assessed, 0 = very limited, 10 = excellent.</p>
        </div>
      </div>

      <div className="mt-4">
        <FloatInput label="Limitation Notes" multiline autoGrow value={form.flexibilityLimitationNotes} onChange={(v) => set('flexibilityLimitationNotes', v)} />
      </div>

      {error && <p className="mt-3 text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}

      {category && (
        <div className="mt-6 flex items-center gap-2">
          <span className="text-[11px] font-[700] uppercase tracking-wider text-slate-400">Classification</span>
          <span className="rounded-full px-3 py-1 text-[12px] font-[700]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
            {category}
          </span>
        </div>
      )}

      {hasAsymmetry && (
        <div className="mt-4 flex items-start gap-3 rounded-[16px] p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
          <p className="text-[13px] font-[640]" style={{ color: '#92400e' }}>
            Left/right asymmetry &gt; 10% detected. Consider a corrective mobility focus.
          </p>
        </div>
      )}
    </div>
  );
}

export default StepFlexibility;
