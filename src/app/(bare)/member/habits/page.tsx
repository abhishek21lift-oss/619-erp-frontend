'use client';
/**
 * Member — Daily journal (Module 5).
 *
 * One row per day, editable, mobile first. Every number is optional: a member
 * who only knows their sleep can log that, and a missing day stays missing
 * rather than becoming a zero in an average.
 *
 * Sleep's 7–9 hour range is shown as a general adult reference, not a target
 * the app invented for this person. Electrolytes are optional and not
 * presented as something everyone should supplement.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, CalendarDays, CheckCircle2, Droplets, Footprints,
  Loader2, Moon, RefreshCw, Sparkles, Waves,
} from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section, Stat, longDate,
} from '@/components/member/MemberUI';
import {
  ChoiceChips, DateFieldControl, FormErrorBanner, NumberField,
  TextAreaField, useStandaloneField,
} from '@/components/ui/form';
import { api } from '@/lib/api';
import type { ProgressDashboard, ProgressHabitLog } from '@/lib/api';
import { useAppForm } from '@/lib/forms/useAppForm';
import {
  blankMemberHabit, memberHabitSchema, toMemberHabitPayload,
} from '@/lib/forms/schemas/memberHabit';
import { blue } from '@/lib/palette';
import { useToast } from '@/lib/toast';
import { errorMessage } from '@/lib/forms/errors';

const SCALE = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: String(n),
}));

export default function MemberHabitsPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <HabitJournal />
      </MemberShell>
    </Guard>
  );
}

function HabitJournal() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<ProgressDashboard | null>(null);
  const [existing, setExisting] = useState<ProgressHabitLog | null>(null);
  const [logs, setLogs] = useState<ProgressHabitLog[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [failed, setFailed] = useState('');
  const [dayFailed, setDayFailed] = useState('');

  const loadSummary = useCallback(async (date?: string) => {
    const dash = await api.me.progress({ days: 30, date });
    setSummary(dash.data);
    if (!selectedDate) setSelectedDate(dash.data.today);
    const from = dash.data.period.start_date;
    const to = dash.data.period.end_date;
    const list = await api.me.habitLogs(from, to);
    setLogs(list.data);
  }, [selectedDate]);

  const loadDay = useCallback(async (date: string) => {
    if (!date) return;
    setDayLoading(true);
    setDayFailed('');
    setExisting(null);
    try {
      const r = await api.me.todayHabit(date);
      setExisting(r.data);
    } catch (err) {
      setDayFailed(errorMessage(err, 'Could not load that day.'));
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setFailed('');
    api.me.progress({ days: 30 })
      .then((dash) => {
        if (!live) return;
        setSummary(dash.data);
        setSelectedDate(dash.data.today);
        return api.me.habitLogs(dash.data.period.start_date, dash.data.period.end_date)
          .then((list) => { if (live) setLogs(list.data); })
          .then(() => undefined);
      })
      .catch((err) => { if (live) setFailed(errorMessage(err, 'Could not load your journal.')); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    void loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  const dateField = useStandaloneField('journal-date', selectedDate, (v) => {
    setSelectedDate(v || '');
  });

  const today = summary?.today || '';
  const todayLog = summary?.habits.today.log ?? null;
  const checklist = summary?.habits.today.checklist ?? [];
  const completion = summary?.habits.today.completion ?? 0;
  const averages = summary?.habits.averages;
  const last7 = summary?.habits.last_7_days;
  const streak = summary?.habits.streaks.logging_days ?? 0;
  const missing = summary?.habits.data_quality.missing_days ?? 0;

  const past = useMemo(
    () => [...logs]
      .filter((l) => l.log_date !== selectedDate)
      .sort((a, b) => b.log_date.localeCompare(a.log_date))
      .slice(0, 7),
    [logs, selectedDate],
  );

  const onSaved = async () => {
    toast.success('Journal saved');
    await loadDay(selectedDate);
    try { await loadSummary(); } catch { /* the saved row is already confirmed */ }
  };

  return (
    <>
      <PageTitle
        accent="checkin"
        icon={<CalendarDays size={20} />}
        title="Daily journal"
        sub="Sleep, movement and how you feel — one small entry a day."
      />

      {failed && <LoadError what="your daily journal" />}
      {!summary && !failed && <PageSkeleton />}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Logging streak" value={`${streak} day${streak === 1 ? '' : 's'}`} tone={MC.success} />
            <Stat label="Sleep · 7 days"
              value={last7?.sleep_average == null ? '—' : `${Number(last7.sleep_average).toFixed(1)} h`}
              tone={MC.primary} />
            <Stat label="Steps · 7 days"
              value={last7?.steps_average == null ? '—' : Math.round(Number(last7.steps_average)).toLocaleString()}
              tone="#10b981" />
            <Stat label="Recovery · 30 days"
              value={averages?.recovery_level?.average == null ? '—' : `${Number(averages.recovery_level.average).toFixed(1)}/5`}
              tone={blue[500]} />
          </div>
          <p className="text-[11px]" style={{ color: MC.muted }}>
            Seven-day sleep and steps cover {last7?.sleep_samples ?? 0} and {last7?.step_samples ?? 0} logged days; a missing day is not a zero.
          </p>

          <Section title="Today’s checklist" aside={<span className="text-[11px] font-[700]" style={{ color: MC.muted }}>{Math.round(completion * 100)}% complete</span>}>
            <Card>
              {checklist.map((item, i) => (
                <div key={item.key} className="flex items-start gap-2.5 px-4 py-3"
                  style={i === checklist.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                  <span className="mt-0.5 inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full"
                    style={item.done ? { background: 'rgba(16,185,129,0.15)', color: MC.success } : { border: '1.5px solid var(--border)' }}>
                    {item.done && <CheckCircle2 size={13} aria-hidden />}
                    <span className="sr-only">{item.done ? 'Done' : 'Not done'}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[12.5px] font-[720]" style={{ color: MC.ink }}>{item.label}</span>
                      {item.optional && <span className="text-[9.5px] font-[750] uppercase tracking-[0.06em]" style={{ color: MC.muted }}>Optional</span>}
                    </span>
                    <span className="mt-0.5 block text-[11px]" style={{ color: MC.muted }}>
                      {item.detail}{item.target ? ` · ${item.target}` : ''}
                    </span>
                  </span>
                </div>
              ))}
            </Card>
          </Section>

          {missing > 0 && (
            <div className="flex items-start gap-2 rounded-[14px] px-4 py-3 text-[12px]"
              style={{ background: 'rgba(245,158,11,0.08)', color: '#92400e' }}>
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span>{missing} day{missing === 1 ? '' : 's'} in the last 30 have no entry. Averages use only the days you logged.</span>
            </div>
          )}

          <Section title="Which day?" aside={<Link href="/member/progress" className="text-[11.5px] font-[720]" style={{ color: MC.primary }}>Assessment progress →</Link>}>
            <Card className="p-4">
              <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-end">
                <DateFieldControl field={dateField} label="Journal date" max={today} />
                <p className="text-[11.5px] leading-relaxed" style={{ color: MC.muted }}>
                  Today is {longDate(today) ?? today}. You can edit an earlier day; the entry keeps its own date.
                </p>
              </div>
            </Card>
          </Section>

          {dayFailed ? (
            <Card className="p-6 text-center">
              <p className="text-[13px] font-[700]" style={{ color: MC.ink }}>We could not load that day</p>
              <p className="mt-1 text-[12px]" style={{ color: MC.muted }}>{dayFailed}</p>
              <button type="button" onClick={() => void loadDay(selectedDate)}
                className="mt-3 rounded-[10px] px-4 py-2 text-[12px] font-[750] text-white"
                style={{ background: MC.primary }}>
                Try again
              </button>
            </Card>
          ) : dayLoading ? (
            <Card className="flex items-center justify-center p-8">
              <Loader2 size={20} className="animate-spin" style={{ color: MC.primary }} />
            </Card>
          ) : (
            <HabitForm
              key={`${selectedDate}-${existing?.updated_at ?? 'new'}`}
              date={selectedDate}
              existing={existing}
              onSaved={onSaved}
            />
          )}

          <Section title="The last 7 entries" aside={<span className="text-[11px]" style={{ color: MC.muted }}>Newest first</span>}>
            <Card>
              {past.length === 0 ? (
                <div className="p-4">
                  <EmptyState icon={<Sparkles size={18} />} title="No other entries yet"
                    body="Each saved day appears here. Nothing is backfilled or estimated." />
                </div>
              ) : (
                past.map((l, i) => <LogRow key={l.id} log={l} last={i === past.length - 1} />)
              )}
            </Card>
          </Section>

          {todayLog && todayLog.log_date === today && selectedDate !== today && (
            <p className="text-center text-[11px]" style={{ color: MC.muted }}>
              Today already has an entry. Open {longDate(today) ?? 'today'} to edit it.
            </p>
          )}

          <div className="flex items-start gap-2 rounded-[14px] px-4 py-3 text-[11.5px] leading-relaxed"
            style={{ background: 'var(--bg-subtle)', color: MC.muted }}>
            <Moon size={14} className="mt-0.5 shrink-0" />
            <span>
              Seven to nine hours is a general adult sleep reference, not a prescription. Electrolytes are optional:
              sweat, diet, medication and medical conditions all change what a person needs.
            </span>
          </div>
        </>
      )}
    </>
  );
}

function HabitForm({ date, existing, onSaved }: {
  date: string;
  existing: ProgressHabitLog | null;
  onSaved: () => Promise<void>;
}) {
  const f = useAppForm({
    schema: memberHabitSchema,
    defaultValues: blankMemberHabit(existing, date),
    onSubmit: async (values) => {
      await api.me.saveHabit(toMemberHabitPayload(values));
    },
    onSuccess: () => { void onSaved(); },
  });
  const { form, isSubmitting } = f;

  return (
    <Section
      title={existing ? `Edit ${longDate(date) ?? date}` : `Log ${longDate(date) ?? date}`}
      aside={existing ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-[700]" style={{ color: MC.success }}>
          <CheckCircle2 size={12} /> Saved
        </span>
      ) : null}
    >
      <Card className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void f.submit();
          }}
          noValidate
          className="space-y-4"
        >
          <FormErrorBanner errors={f.errors} onRetry={() => void f.submit()} />

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-[720]" style={{ color: MC.ink }}>
              <Moon size={14} style={{ color: MC.primary }} /> Sleep
            </div>
            <div className="grid grid-cols-2 gap-3">
              <form.Field name="sleepHours">
                {(field) => (
                  <NumberField field={field} label="Duration" mode="decimal" suffix="hours"
                    placeholder="e.g. 7.5" serverError={f.errors.fieldErrors.sleepHours} />
                )}
              </form.Field>
              <form.Field name="sleepQuality">
                {(field) => (
                  <ChoiceChips field={field} legend="Quality" density="compact" options={SCALE}
                    serverError={f.errors.fieldErrors.sleepQuality} />
                )}
              </form.Field>
            </div>
            <p className="mt-1 text-[10.5px]" style={{ color: MC.muted }}>1 = very poor, 5 = excellent.</p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-[720]" style={{ color: MC.ink }}>
              <Footprints size={14} style={{ color: '#10b981' }} /> Movement
            </div>
            <form.Field name="steps">
              {(field) => (
                <NumberField field={field} label="Steps" mode="integer" placeholder="e.g. 8000"
                  serverError={f.errors.fieldErrors.steps} />
              )}
            </form.Field>
            <p className="mt-1 text-[10.5px]" style={{ color: MC.muted }}>
              Typed values are stored as self-reported. Values from a connected device or import stay labelled separately.
            </p>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-[720]" style={{ color: MC.ink }}>
              <Droplets size={14} style={{ color: blue[400] }} /> Water
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.Field name="waterMl">
                {(field) => (
                  <NumberField field={field} label="How much" mode="integer" suffix="ml"
                    placeholder="e.g. 2000" serverError={f.errors.fieldErrors.waterMl} />
                )}
              </form.Field>
              <form.Field name="electrolytes">
                {(field) => (
                  <ChoiceChips field={field} legend="Electrolytes (optional)" density="compact"
                    options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                    serverError={f.errors.fieldErrors.electrolytes} />
                )}
              </form.Field>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-[720]" style={{ color: MC.ink }}>
              <Waves size={14} style={{ color: blue[500] }} /> How you feel
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <form.Field name="stressLevel">
                {(field) => <ChoiceChips field={field} legend="Stress" density="compact" options={SCALE} serverError={f.errors.fieldErrors.stressLevel} />}
              </form.Field>
              <form.Field name="energyLevel">
                {(field) => <ChoiceChips field={field} legend="Energy" density="compact" options={SCALE} serverError={f.errors.fieldErrors.energyLevel} />}
              </form.Field>
              <form.Field name="fatigueLevel">
                {(field) => <ChoiceChips field={field} legend="Fatigue" density="compact" options={SCALE} serverError={f.errors.fieldErrors.fatigueLevel} />}
              </form.Field>
              <form.Field name="sorenessLevel">
                {(field) => <ChoiceChips field={field} legend="Soreness" density="compact" options={SCALE} serverError={f.errors.fieldErrors.sorenessLevel} />}
              </form.Field>
              <form.Field name="recoveryLevel">
                {(field) => <ChoiceChips field={field} legend="Recovery" density="compact" options={SCALE} serverError={f.errors.fieldErrors.recoveryLevel} />}
              </form.Field>
            </div>
            <p className="mt-1 text-[10.5px]" style={{ color: MC.muted }}>1 = low, 5 = high. For soreness, 1 is none and 5 is severe.</p>
          </div>

          <form.Field name="notes">
            {(field) => (
              <TextAreaField field={field} label="Notes (optional)" rows={3} maxLength={2000}
                placeholder="A late meal, a long walk, a niggle — anything that explains the numbers."
                serverError={f.errors.fieldErrors.notes} />
            )}
          </form.Field>

          <button type="submit" disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[13px] text-[14px] font-[750] text-white disabled:opacity-60"
            style={{ background: MC.primary }}>
            {isSubmitting
              ? <><RefreshCw size={16} className="animate-spin" /> Saving…</>
              : existing ? 'Update this day' : 'Save this day'}
          </button>
          <p className="text-center text-[11px]" style={{ color: MC.muted }}>
            Only you and your trainer can see this. You can edit it later.
          </p>
        </form>
      </Card>
    </Section>
  );
}

function LogRow({ log, last }: { log: ProgressHabitLog; last: boolean }) {
  const bits = [
    log.sleep_hours == null ? null : `${Number(log.sleep_hours)} h sleep`,
    log.steps == null ? null : `${Number(log.steps).toLocaleString()} steps`,
    log.water_ml == null ? null : `${Number(log.water_ml).toLocaleString()} ml`,
    log.recovery_level == null ? null : `recovery ${log.recovery_level}/5`,
    log.stress_level == null ? null : `stress ${log.stress_level}/5`,
  ].filter(Boolean) as string[];
  const updated = log.updated_at ? new Date(log.updated_at) : null;
  return (
    <div className="px-4 py-3" style={last ? undefined : { borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-[720]" style={{ color: MC.ink }}>{longDate(log.log_date) ?? log.log_date}</p>
        <span className="inline-flex items-center gap-1 text-[10px] font-[700] uppercase tracking-[0.04em]" style={{ color: MC.muted }}>
          <Activity size={11} /> {log.source}
          {log.steps_source && log.steps_source !== 'manual' ? ` · ${log.steps_source} steps` : ''}
        </span>
      </div>
      {bits.length > 0 && <p className="mt-0.5 text-[11.5px]" style={{ color: MC.muted }}>{bits.join(' · ')}</p>}
      {log.notes && <p className="mt-1 text-[11.5px] leading-relaxed" style={{ color: MC.muted }}>{log.notes}</p>}
      {updated && !Number.isNaN(updated.getTime()) && (
        <p className="mt-1 text-[10.5px]" style={{ color: MC.muted }}>
          Updated {updated.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}
