'use client';

import { ClipboardList, Check } from 'lucide-react';
import type { ParqFormData, PastHistoryForm } from './types';

type PastHistoryBoolKey =
  | 'heart_disease' | 'respiratory_disease' | 'asthma' | 'copd' | 'tuberculosis'
  | 'joint_problems' | 'back_pain' | 'neck_pain' | 'knee_pain' | 'shoulder_pain' | 'hip_pain'
  | 'previous_fractures' | 'surgeries' | 'hospitalization' | 'previous_physiotherapy' | 'previous_trainer';

// Heart Disease, Asthma, Joint Problems, Back/Neck/Knee/Shoulder/Hip Pain
// were dropped from this checklist — they're already covered by the PAR-Q
// gatekeeper questions and the client's pain/injury notes elsewhere in the
// form, so listing them again here was redundant. The underlying boolean
// fields still exist on PastHistoryForm (and in the saved API payload) so
// older submitted forms keep rendering correctly; they just default to
// false and are no longer collected here.
const CONDITIONS: { key: PastHistoryBoolKey; label: string }[] = [
  { key: 'respiratory_disease', label: 'Respiratory Disease' },
  { key: 'copd', label: 'COPD' },
  { key: 'tuberculosis', label: 'Tuberculosis' },
  { key: 'previous_fractures', label: 'Previous Fractures' },
  { key: 'surgeries', label: 'Surgeries' },
  { key: 'hospitalization', label: 'Hospitalization' },
];

interface StepPastHistoryProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
  stepLabel: string;
}

export function StepPastHistory({ form, set, error, stepLabel }: StepPastHistoryProps) {
  const ph = form.pastHistory;
  const setPh = <K extends keyof PastHistoryForm>(key: K, val: PastHistoryForm[K]) => {
    set('pastHistory', { ...ph, [key]: val });
  };
  const toggleBool = (key: PastHistoryBoolKey) => setPh(key, !ph[key]);

  return (
    <div className="space-y-7">
      <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <ClipboardList size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Past Medical History</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">{stepLabel} — select any conditions ever diagnosed.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {CONDITIONS.map((c) => {
            const checked = ph[c.key];
            return (
              <button
                key={c.key} type="button" onClick={() => toggleBool(c.key)}
                className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-left transition-all"
                style={{ background: checked ? 'rgba(0,103,224,0.06)' : 'var(--bg-subtle)', border: checked ? '1.5px solid #0067E0' : '1.5px solid rgba(15,23,42,0.08)' }}
              >
                <span className="flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-[5px]" style={{ background: checked ? '#0067E0' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1', width: 18, height: 18 }}>
                  {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                </span>
                <span className="text-[12px] font-[650]" style={{ color: checked ? '#0f172a' : '#475569' }}>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* previous_trainer moved to the PT enrollment form — a training-history
            question belongs with Training Mode/Workout Experience there, not
            in a medical screening. The field stays on PastHistoryForm (see the
            comment on CONDITIONS above) so older submitted forms still render;
            it just defaults to false and is no longer collected here. */}
        <button
          type="button" onClick={() => toggleBool('previous_physiotherapy')}
          className="flex w-full items-center gap-2.5 rounded-[12px] px-3.5 py-3 text-left transition-all sm:w-auto"
          style={{ background: ph.previous_physiotherapy ? 'rgba(0,103,224,0.06)' : 'var(--bg-subtle)', border: ph.previous_physiotherapy ? '1.5px solid #0067E0' : '1.5px solid rgba(15,23,42,0.08)' }}
        >
          <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px]" style={{ background: ph.previous_physiotherapy ? '#0067E0' : '#fff', border: ph.previous_physiotherapy ? 'none' : '1.5px solid #cbd5e1' }}>
            {ph.previous_physiotherapy && <Check size={11} color="#fff" strokeWidth={3} />}
          </span>
          <span className="text-[12.5px] font-[650]" style={{ color: ph.previous_physiotherapy ? '#0f172a' : '#475569' }}>Previous Physiotherapy</span>
        </button>

      {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>}
    </div>
  );
}

export default StepPastHistory;
