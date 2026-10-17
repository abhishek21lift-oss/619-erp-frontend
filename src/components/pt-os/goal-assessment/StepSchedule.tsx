'use client';
import { useMemo } from 'react';
import { Calendar, Dumbbell } from 'lucide-react';
import { recommendTrainingSplit, buildRoutineBlueprint } from '@/lib/goal-scheduling';
import { FormField } from '@/components/ui';

interface StepScheduleProps {
  form: { trainingDays: string; experienceLevel: string; equipment: string; goalType: string };
  set: (key: any, value: any) => void;
}

export default function StepSchedule({ form, set }: StepScheduleProps) {
  const schedule = useMemo(() => recommendTrainingSplit(form.trainingDays, { goal: form.goalType, experience: form.experienceLevel }), [form.trainingDays, form.goalType, form.experienceLevel]);
  const blueprint = useMemo(() => buildRoutineBlueprint({ goal: form.goalType, experience: form.experienceLevel, equipment: form.equipment, trainingDays: form.trainingDays, split: schedule.split }), [form, schedule.split]);

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <Calendar size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Training Schedule & Routine</h2>
            <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">Step 9 of 9 — available training days drive the recommended split.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Training days / week" htmlFor="step-schedule-days">
            <select id="step-schedule-days" value={form.trainingDays} onChange={(e) => set('trainingDays', e.target.value)} className="w-full rounded-[12px] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              {[1,2,3,4,5,6,7].map((d) => <option key={d} value={String(d)}>{d} day{d>1?'s':''}</option>)}
            </select>
          </FormField>
          <FormField label="Experience level" htmlFor="step-schedule-exp">
            <select id="step-schedule-exp" value={form.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)} className="w-full rounded-[12px] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </FormField>
          <FormField label="Equipment" htmlFor="step-schedule-equip">
            <select id="step-schedule-equip" value={form.equipment} onChange={(e) => set('equipment', e.target.value)} className="w-full rounded-[12px] border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <option value="full_gym">Full Gym</option>
              <option value="dumbbells">Dumbbells Only</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="bands">Resistance Bands</option>
            </select>
          </FormField>
        </div>

        <div className="rounded-[16px] p-5" style={{ background: 'var(--bg-subtle)' }}>
          <p className="text-[13px] font-[760] text-[color:var(--text-primary)]">{schedule.label}</p>
          <p className="text-[12px] text-[color:var(--text-muted)] mt-1">{schedule.notes}</p>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {schedule.calendar.map((d) => (
            <div key={d.dayIndex} className="rounded-[12px] p-2 text-center" style={{ background: d.type === 'training' ? 'rgba(0,103,224,0.10)' : 'var(--bg-subtle)', border: d.type === 'training' ? '1px solid rgba(0,103,224,0.3)' : '1px solid var(--border)' }}>
              <p className="text-[10px] font-[700] uppercase" style={{ color: 'var(--text-muted)' }}>{d.dayName.slice(0,3)}</p>
              <p className="text-[11px] font-[600] mt-1" style={{ color: d.type === 'training' ? '#0059CE' : 'var(--text-muted)' }}>{d.type === 'training' ? (d.session || 'Train') : 'Rest'}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[16px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={16} color="#0059CE" />
            <p className="text-[13px] font-[760] text-[color:var(--text-primary)]">Routine Blueprint Preview</p>
          </div>
          <ul className="text-[12px] text-[color:var(--text-secondary)] space-y-1">
            <li>Warm-up: {blueprint.sessionTemplate.warmup}</li>
            <li>Main lifts: {blueprint.sessionTemplate.mainLifts.sets} sets × {blueprint.sessionTemplate.mainLifts.reps} reps @ {blueprint.sessionTemplate.mainLifts.rpeOrRir}, rest {blueprint.sessionTemplate.mainLifts.rest}</li>
            <li>Accessories: {blueprint.sessionTemplate.accessories.sets} sets × {blueprint.sessionTemplate.accessories.reps}</li>
            <li>Core: {blueprint.sessionTemplate.core.sets} sets × {blueprint.sessionTemplate.core.reps}</li>
            <li>Deload every 4-6 weeks; reassess every {blueprint.reassessmentWeeks} weeks.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
