'use client';

import { ClipboardList, Check } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { ParqFormData, PastHistoryForm } from './types';

type PastHistoryBoolKey =
  | 'heart_disease' | 'respiratory_disease' | 'asthma' | 'copd' | 'tuberculosis'
  | 'joint_problems' | 'back_pain' | 'neck_pain' | 'knee_pain' | 'shoulder_pain' | 'hip_pain'
  | 'previous_fractures' | 'surgeries' | 'hospitalization' | 'previous_physiotherapy' | 'previous_trainer';

const CONDITIONS: { key: PastHistoryBoolKey; label: string }[] = [
  { key: 'heart_disease', label: 'Heart Disease' },
  { key: 'respiratory_disease', label: 'Respiratory Disease' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'copd', label: 'COPD' },
  { key: 'tuberculosis', label: 'Tuberculosis' },
  { key: 'joint_problems', label: 'Joint Problems' },
  { key: 'back_pain', label: 'Back Pain' },
  { key: 'neck_pain', label: 'Neck Pain' },
  { key: 'knee_pain', label: 'Knee Pain' },
  { key: 'shoulder_pain', label: 'Shoulder Pain' },
  { key: 'hip_pain', label: 'Hip Pain' },
  { key: 'previous_fractures', label: 'Previous Fractures' },
  { key: 'surgeries', label: 'Surgeries' },
  { key: 'hospitalization', label: 'Hospitalization' },
];

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced', 'athlete'];

interface StepPastHistoryProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
}

export function StepPastHistory({ form, set, error }: StepPastHistoryProps) {
  const ph = form.pastHistory;
  const setPh = <K extends keyof PastHistoryForm>(key: K, val: PastHistoryForm[K]) => {
    set('pastHistory', { ...ph, [key]: val });
  };
  const toggleBool = (key: PastHistoryBoolKey) => setPh(key, !ph[key]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <ClipboardList size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Past Medical History</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Step 3 of 8 — select any conditions ever diagnosed.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {CONDITIONS.map((c) => {
            const checked = ph[c.key];
            return (
              <button
                key={c.key} type="button" onClick={() => toggleBool(c.key)}
                className="flex items-center gap-2 rounded-[12px] px-3 py-2.5 text-left transition-all"
                style={{ background: checked ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)', border: checked ? '1.5px solid #F59E0B' : '1.5px solid rgba(15,23,42,0.08)' }}
              >
                <span className="flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-[5px]" style={{ background: checked ? '#F59E0B' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1', width: 18, height: 18 }}>
                  {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                </span>
                <span className="text-[12px] font-[650]" style={{ color: checked ? '#0f172a' : '#475569' }}>{c.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FloatInput label="Work Posture" value={ph.work_posture} onChange={(v) => setPh('work_posture', v)} placeholder="e.g. Standing, Sitting, Mixed" />
          <FloatInput label="Daily Sitting Hours" type="number" value={ph.daily_sitting_hours} onChange={(v) => setPh('daily_sitting_hours', v)} />
        </div>

        <div>
          <p className="mb-3 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Exercise Experience</p>
          <div className="flex flex-wrap gap-2">
            {EXPERIENCE_LEVELS.map((lvl) => {
              const selected = ph.exercise_experience === lvl;
              return (
                <button
                  key={lvl} type="button" onClick={() => setPh('exercise_experience', lvl)}
                  className="rounded-[11px] px-3.5 py-2 text-[12.5px] font-[700] capitalize transition-all"
                  style={{ background: selected ? '#0f172a' : '#f8fafc', color: selected ? '#fff' : '#64748b', border: selected ? '1.5px solid #0f172a' : '1.5px solid #e2e8f0' }}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        <FloatInput label="Exercise History" multiline autoGrow value={ph.exercise_history} onChange={(v) => setPh('exercise_history', v)} />
        <FloatInput label="Previous Injuries" multiline autoGrow value={ph.previous_injuries} onChange={(v) => setPh('previous_injuries', v)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['previous_physiotherapy', 'previous_trainer'] as const).map((key) => {
            const checked = ph[key];
            const label = key === 'previous_physiotherapy' ? 'Previous Physiotherapy' : 'Previously Worked With a Trainer';
            return (
              <button
                key={key} type="button" onClick={() => toggleBool(key)}
                className="flex items-center gap-2.5 rounded-[12px] px-3.5 py-3 text-left transition-all"
                style={{ background: checked ? 'rgba(245,158,11,0.06)' : 'var(--bg-subtle)', border: checked ? '1.5px solid #F59E0B' : '1.5px solid rgba(15,23,42,0.08)' }}
              >
                <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px]" style={{ background: checked ? '#F59E0B' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1' }}>
                  {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                </span>
                <span className="text-[12.5px] font-[650]" style={{ color: checked ? '#0f172a' : '#475569' }}>{label}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </div>
  );
}

export default StepPastHistory;
