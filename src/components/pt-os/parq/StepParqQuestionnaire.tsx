'use client';

import { useMemo } from 'react';
import { ListChecks } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import RiskLevelBanner from '@/components/pt-os/shared/RiskLevelBanner';
import { computeParqRisk } from '@/lib/parq-calculations';
import type { ParqFormData, ParqAnswerForm } from './types';
import { PARQ_QUESTIONS } from './types';

interface StepParqQuestionnaireProps {
  form: ParqFormData;
  set: <K extends keyof ParqFormData>(key: K, val: ParqFormData[K]) => void;
  error?: string;
}

const ANSWER_OPTIONS: { value: ParqAnswerForm['answer']; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not Sure' },
];

export function StepParqQuestionnaire({ form, set, error }: StepParqQuestionnaireProps) {
  const answers = form.parqAnswers;
  const risk = useMemo(() => computeParqRisk(answers), [answers]);

  const updateAnswer = (questionId: number, patch: Partial<ParqAnswerForm>) => {
    set('parqAnswers', answers.map((a) => (a.question_id === questionId ? { ...a, ...patch } : a)));
  };

  const answeredCount = answers.filter((a) => a.answer).length;

  return (
    <div className="space-y-5">
      <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
        <div className="p-7 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
              <ListChecks size={20} color="#F59E0B" />
            </div>
            <div>
              <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">PAR-Q Questionnaire</h2>
              <p className="text-[13px] text-slate-400 mt-1.5">Step 5 of 9 — {answeredCount}/{PARQ_QUESTIONS.length} answered. YES expands follow-up details.</p>
            </div>
          </div>

          {answeredCount > 0 && (
            <RiskLevelBanner level={risk.riskLevel} stat={`${risk.yesCount} of ${PARQ_QUESTIONS.length} flagged YES`} />
          )}

          <div className="space-y-4">
            {PARQ_QUESTIONS.map((q, i) => {
              const a = answers.find((x) => x.question_id === q.id)!;
              const expanded = a.answer === 'yes';
              return (
                <div
                  key={q.id}
                  className="rounded-[18px] p-5"
                  style={{
                    background: expanded ? 'rgba(239,68,68,0.03)' : 'var(--bg-subtle)',
                    border: expanded ? '1.5px solid rgba(239,68,68,0.25)' : '1px solid rgba(15,23,42,0.07)',
                  }}
                >
                  <div className="flex items-start gap-3 mb-3.5">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-[800]" style={{ background: '#0f172a', color: '#fff' }}>
                      {i + 1}
                    </span>
                    <p className="text-[13.5px] font-[650] leading-snug" style={{ color: '#1e293b' }}>{q.text}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 ml-9">
                    {ANSWER_OPTIONS.map((opt) => {
                      const selected = a.answer === opt.value;
                      const color = opt.value === 'yes' ? '#dc2626' : opt.value === 'not_sure' ? '#d97706' : '#059669';
                      return (
                        <button
                          key={opt.value} type="button"
                          onClick={() => updateAnswer(q.id, { answer: opt.value })}
                          className="rounded-[10px] px-4 py-2 text-[12.5px] font-[700] transition-all"
                          style={{
                            background: selected ? color : '#fff',
                            color: selected ? '#fff' : '#64748b',
                            border: selected ? `1.5px solid ${color}` : '1.5px solid #e2e8f0',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {expanded && (
                    <div className="ml-9 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatInput label="Explanation" multiline autoGrow value={a.explanation} onChange={(v) => updateAnswer(q.id, { explanation: v })} />
                      <FloatInput label="Diagnosis Date" type="date" value={a.diagnosis_date} onChange={(v) => updateAnswer(q.id, { diagnosis_date: v })} />
                      <FloatInput label="Treatment" value={a.treatment} onChange={(v) => updateAnswer(q.id, { treatment: v })} />
                      <FloatInput label="Doctor Name" value={a.doctor_name} onChange={(v) => updateAnswer(q.id, { doctor_name: v })} />
                      <FloatInput label="Hospital" value={a.hospital} onChange={(v) => updateAnswer(q.id, { hospital: v })} />
                      <FloatInput label="Notes" value={a.notes} onChange={(v) => updateAnswer(q.id, { notes: v })} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default StepParqQuestionnaire;
