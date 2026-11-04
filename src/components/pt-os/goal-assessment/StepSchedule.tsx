'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Calendar, Clock, Dumbbell, Sparkles } from 'lucide-react';
import { FormField, SelectInput } from '@/components/ui';
import GoalStepCard from './GoalStepCard';
import { indigo, gray, tint } from '@/lib/palette';
import { recommendTrainingSplit, buildRoutineBlueprint } from '@/lib/goal-scheduling';
import { SESSION_MINUTES, TIME_OF_DAY_OPTIONS, WEEKDAY_NAMES, formatWeeklyCommitment, trainingDaysFrom, weeklyCommitmentMinutes } from '@/lib/goal-plan';
import type { TimeOfDay } from '@/lib/goal-plan';
import type { GoalFormData } from './types';

/** The read-only availability the Enrolment form owns. */
export interface EnrolmentAvailability {
  sessions_per_week?: number | string | null;
  session_minutes?: number | string | null;
  preferred_training_days?: string[] | string | null;
  preferred_workout_time?: string | null;
}

interface StepScheduleProps {
  form: Pick<GoalFormData, 'trainingDays' | 'preferredDays' | 'sessionMinutes' | 'timeOfDay' | 'experienceLevel' | 'equipment' | 'goalType'>;
  set: <K extends 'trainingDays' | 'preferredDays' | 'sessionMinutes' | 'timeOfDay' | 'experienceLevel' | 'equipment'>(key: K, val: GoalFormData[K]) => void;
  step: number;
  clientId: string;
  availability?: EnrolmentAvailability;
}

function daysLabel(value: EnrolmentAvailability['preferred_training_days']): string {
  const days = Array.isArray(value)
    ? value
    : typeof value === 'string' ? value.split(',').map((d) => d.trim()).filter(Boolean) : [];
  return days.length ? days.join(', ') : 'Not recorded';
}

function timeLabel(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours)) return value;
  return new Date(2000, 0, 1, hours, Number.isFinite(minutes) ? minutes : 0)
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function StepSchedule({ form, set, step, clientId, availability }: StepScheduleProps) {
  const days = trainingDaysFrom(form.trainingDays);
  const schedule = useMemo(
    () => recommendTrainingSplit(form.trainingDays, { goal: form.goalType, experience: form.experienceLevel, preferredDays: form.preferredDays }),
    [form.trainingDays, form.goalType, form.experienceLevel, form.preferredDays],
  );
  const blueprint = useMemo(() => buildRoutineBlueprint({ goal: form.goalType, experience: form.experienceLevel, equipment: form.equipment, trainingDays: form.trainingDays, split: schedule.split }), [form, schedule.split]);
  const commitment = formatWeeklyCommitment(weeklyCommitmentMinutes(days, form.sessionMinutes));

  const enrolmentDays = availability?.sessions_per_week;
  const enrolmentMinutes = availability?.session_minutes;
  const enrolmentTime = availability?.preferred_workout_time;
  const hasAvailability = enrolmentDays != null || enrolmentMinutes != null || enrolmentTime != null
    || daysLabel(availability?.preferred_training_days) !== 'Not recorded';

  // Nominating more days than the frequency is not an error — it is a client
  // with flexibility. The newest pick wins, so the plan trains on the days
  // they touched last rather than silently ignoring the click.
  const toggleDay = (day: string) => {
    const current = form.preferredDays;
    if (current.includes(day)) return set('preferredDays', current.filter((d) => d !== day));
    if (current.length < days) return set('preferredDays', [...current, day]);
    set('preferredDays', [...current.slice(current.length - days + 1), day]);
  };

  return (
    <GoalStepCard icon={Calendar} title="Training Availability" step={step} hint="what the client can do, then what the plan asks of them">
      <div className="space-y-7">
        {/* Availability belongs to Enrolment. The prescription below belongs
            to this goal, so the two are shown as separate records rather than
            one editable block that looks like it owns both. */}
        <section className="rounded-[18px] p-5" style={{ background: gray[50], border: `1px solid ${gray[200]}` }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-[760] uppercase tracking-[0.14em]" style={{ color: indigo[600] }}>
                Client availability
              </p>
              <h3 className="mt-1 text-[15px] font-[800] tracking-[-0.02em]" style={{ color: gray[900] }}>
                From Enrolment · read-only
              </h3>
              <p className="mt-1 max-w-[54ch] text-[12px] leading-relaxed" style={{ color: gray[500] }}>
                When the client said they can train. The programmed schedule below is the prescription and may differ.
              </p>
            </div>
            <Link
              href={`/pt-os/clients/${encodeURIComponent(clientId)}/enroll`}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-[700]"
              style={{ background: 'var(--bg-card)', border: `1px solid ${gray[200]}`, color: indigo[700] }}
            >
              Edit in Enrolment <ArrowUpRight size={12} />
            </Link>
          </div>

          {hasAvailability ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: 'Days / week', value: enrolmentDays != null ? String(enrolmentDays) : '—' },
                { label: 'Session', value: enrolmentMinutes != null ? `${enrolmentMinutes} min` : '—' },
                { label: 'Preferred days', value: daysLabel(availability?.preferred_training_days) },
                { label: 'Preferred time', value: timeLabel(enrolmentTime) },
              ].map((row) => (
                <div key={row.label} className="rounded-[12px] px-3.5 py-2.5" style={{ background: 'var(--bg-card)', border: `1px solid ${gray[200]}` }}>
                  <p className="text-[10px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>{row.label}</p>
                  <p className="mt-0.5 text-[12.5px] font-[760]" style={{ color: gray[800] }}>{row.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-[12px] px-4 py-3 text-[12.5px]" style={{ background: 'var(--bg-card)', color: gray[600], border: `1px solid ${gray[200]}` }}>
              No training availability recorded yet. Set it in Enrolment, or prescribe below from what the client has told you.
            </p>
          )}
        </section>

        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-[10px]"
            style={{ background: tint(indigo[500], 0.10), color: indigo[700] }}
          >
            <Sparkles size={15} />
          </span>
          <div>
            <p className="text-[10px] font-[760] uppercase tracking-[0.14em]" style={{ color: indigo[600] }}>Programmed schedule</p>
            <h3 className="text-[15px] font-[800] tracking-[-0.02em]" style={{ color: gray[900] }}>Prescription for this goal</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Training days / week">
            <SelectInput value={form.trainingDays} onChange={(e) => {
              set('trainingDays', e.target.value);
              const next = trainingDaysFrom(e.target.value);
              if (form.preferredDays.length > next) set('preferredDays', form.preferredDays.slice(0, next));
            }}>
              {[1,2,3,4,5,6,7].map((d) => <option key={d} value={String(d)}>{d} day{d>1?'s':''}</option>)}
            </SelectInput>
          </FormField>
          <FormField label="Session length">
            <SelectInput value={form.sessionMinutes} onChange={(e) => set('sessionMinutes', e.target.value)}>
              {SESSION_MINUTES.map((m) => <option key={m} value={String(m)}>{m} minutes</option>)}
            </SelectInput>
          </FormField>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Preferred days</p>
          <div className="grid grid-cols-7 gap-2">
            {WEEKDAY_NAMES.map((day) => {
              const selected = form.preferredDays.includes(day);
              return (
                <button
                  key={day} type="button" onClick={() => toggleDay(day)} aria-pressed={selected}
                  className="rounded-[12px] py-2.5 text-[11.5px] font-[700] transition-all"
                  style={{
                    background: selected ? tint(indigo[500], 0.1) : gray[50],
                    border: selected ? `1.5px solid ${indigo[500]}` : `1.5px solid ${gray[200]}`,
                    color: selected ? indigo[700] : gray[500],
                  }}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11.5px]" style={{ color: gray[500] }}>
            Optional. The plan trains on your {days} nominated day{days > 1 ? 's' : ''} instead of spreading sessions evenly.
          </p>
        </div>

        <div>
          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: gray[500] }}>Preferred time of day</p>
          <div className="flex flex-wrap gap-2">
            {TIME_OF_DAY_OPTIONS.map((o) => {
              const selected = form.timeOfDay === o.value;
              return (
                <button
                  key={o.value} type="button" onClick={() => set('timeOfDay', o.value as TimeOfDay)}
                  aria-pressed={selected}
                  className="rounded-[12px] px-4 py-2 text-[12.5px] font-[700]"
                  style={{
                    background: selected ? tint(indigo[500], 0.1) : gray[50],
                    border: selected ? `1.5px solid ${indigo[500]}` : `1.5px solid ${gray[200]}`,
                    color: selected ? indigo[700] : gray[600],
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[16px] px-5 py-4" style={{ background: gray[50] }}>
          <Clock size={18} style={{ color: indigo[600] }} />
          <div>
            <p className="text-[11px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>Weekly time commitment</p>
            <p className="text-[16px] font-[840]" style={{ color: gray[800] }}>{commitment}</p>
          </div>
          <p className="ml-auto text-[11.5px]" style={{ color: gray[500] }}>{days} × {form.sessionMinutes || '—'} min</p>
        </div>

        <div className="rounded-[16px] p-5" style={{ background: gray[50] }}>
          <p className="text-[13px] font-[760] text-[color:var(--text-primary)]">{schedule.label}</p>
          <p className="text-[12px] text-[color:var(--text-muted)] mt-1">{schedule.notes}</p>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {schedule.calendar.map((d) => (
            <div key={d.dayIndex} className="rounded-[12px] p-2 text-center" style={{ background: d.type === 'training' ? 'rgba(163,55,87,0.10)' : 'var(--bg-subtle)', border: d.type === 'training' ? '1px solid rgba(163,55,87,0.3)' : '1px solid var(--border)' }}>
              <p className="text-[10px] font-[700] uppercase" style={{ color: 'var(--text-muted)' }}>{d.dayName.slice(0,3)}</p>
              <p className="text-[11px] font-[600] mt-1" style={{ color: d.type === 'training' ? '#852E4E' : 'var(--text-muted)' }}>{d.type === 'training' ? (d.session || 'Train') : 'Rest'}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Experience level">
            <SelectInput value={form.experienceLevel} onChange={(e) => set('experienceLevel', e.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </SelectInput>
          </FormField>
          <FormField label="Equipment">
            <SelectInput value={form.equipment} onChange={(e) => set('equipment', e.target.value)}>
              <option value="full_gym">Full Gym</option>
              <option value="dumbbells">Dumbbells Only</option>
              <option value="bodyweight">Bodyweight</option>
              <option value="bands">Resistance Bands</option>
            </SelectInput>
          </FormField>
        </div>

        <div className="rounded-[16px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell size={16} color="#852E4E" />
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
    </GoalStepCard>
  );
}
