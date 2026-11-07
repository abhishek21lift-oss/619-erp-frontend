'use client';
/**
 * Trainer-facing workout generator.
 *
 * The rules engine on the server picks, sequences and prescribes; this page is
 * the review surface. Nothing is saved until the trainer presses save, and
 * saving writes every generated session as a plan and assigns that plan to the
 * client in one step — so a generated programme is live exactly like a
 * hand-built one, instead of being left in a builder nobody is on.
 *
 * The draft is a suggestion, not a verdict: excluded exercises are shown with
 * the reason they were left out, so "why isn't the deadlift here" is answered
 * on the screen instead of in the trainer's head.
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Guard from '@/components/Guard';
import { PageContainer, PageHero, Button, FormField, TextInput, SelectInput } from '@/components/ui';
import ClientPicker from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { Dumbbell, Loader2, RefreshCw, Save, AlertTriangle, Info } from 'lucide-react';
import {
  CARDIO_PROGRAM_TYPES,
  K11_INTENSITY_BANDS,
  getK11IntensityBand,
} from '@/lib/cardio-calculations';
import type { GeneratedSession, GeneratedWorkout } from '@/lib/generated-workout';
import type { TrainingMaxLift } from '@/lib/api/endpoints/training';

const GOALS = [
  { value: '', label: 'Use client goal' },
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'body_recomposition', label: 'Body recomposition' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'flexibility_mobility', label: 'Flexibility & mobility' },
  { value: 'powerlifting', label: 'Powerlifting' },
];

const EXPERIENCE = [
  { value: '', label: 'Use client level' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

/** "6-8" → 6. The plan column is an integer; the full range goes in notes. */
function repsLowerBound(reps: string): number {
  const n = parseInt(String(reps), 10);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

/** Blank means "not supplied". Anything else must be a whole number in range. */
function optionalInt(value: string, min: number, max: number): number | undefined {
  const text = value.trim();
  if (!text) return undefined;
  const n = Number(text);
  return Number.isInteger(n) && n >= min && n <= max ? n : NaN;
}

/** One generated session's main work as plan rows for a given week. */
function planRows(session: GeneratedSession, week: number) {
  return session.mainWork.map((ex, i) => ({
    exercise_id: ex.id,
    day_of_week: session.day_of_week,
    week_number: week,
    sort_order: i + 1,
    sets: ex.prescription.sets,
    reps: repsLowerBound(ex.prescription.reps),
    rest_seconds: ex.prescription.restSeconds,
    rpe: ex.prescription.rpe ?? undefined,
    rir: ex.prescription.rir ?? undefined,
    target_weight: ex.prescription.target_weight ?? undefined,
    notes: [
      ex.reason,
      `Prescribed ${ex.prescription.reps} reps, RPE ${ex.prescription.rpe ?? '—'}`,
      ex.prescription.rir != null ? `(RIR ${ex.prescription.rir})` : '',
      ex.prescription.intensityPct1RM ? `${ex.prescription.intensityPct1RM}% 1RM.` : '',
      // A block's reason already quotes the prescription notes.
      ex.reason.includes(ex.prescription.notes) ? '' : ex.prescription.notes,
    ].filter(Boolean).join(' '),
  }));
}

function GeneratorScreen({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [avoidPatterns, setAvoidPatterns] = useState('');
  const [avoidMuscles, setAvoidMuscles] = useState('');
  const [equipment, setEquipment] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('4');
  const [periodization, setPeriodization] = useState('');
  const [blockWeeks, setBlockWeeks] = useState('12');
  const [blockWeek, setBlockWeek] = useState(1);
  const [tmLifts, setTmLifts] = useState<TrainingMaxLift[]>([]);
  const [tmValues, setTmValues] = useState<Record<string, string>>({});
  const [tmBusy, setTmBusy] = useState(false);
  const [cardio, setCardio] = useState('');
  const [cardioIntensity, setCardioIntensity] = useState('');
  const [cardioMethod, setCardioMethod] = useState('');
  const [cardioFrequency, setCardioFrequency] = useState('');
  const [cardioProgram, setCardioProgram] = useState('');
  const [age, setAge] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [measuredMhr, setMeasuredMhr] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<GeneratedWorkout | null>(null);
  const [clientName, setClientName] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadTrainingMaxes = useCallback(async () => {
    try {
      const data = await api.workoutGenerator.trainingMaxes.list(clientId);
      setTmLifts(data.lifts);
      setTmValues(Object.fromEntries(data.lifts.map((lift) => [
        lift.exercise_id,
        lift.training_max_kg != null ? String(lift.training_max_kg) : '',
      ])));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load training maxes');
    }
  }, [clientId, toast]);

  useEffect(() => {
    if (periodization === 'powerlifting_block') void loadTrainingMaxes();
  }, [periodization, loadTrainingMaxes]);

  /**
   * Save one max before generating. A percentage block is only as honest as
   * the number behind it, and the suggestion is never applied automatically —
   * the trainer types or accepts it, then it is stored.
   */
  const saveTrainingMax = useCallback(async (lift: TrainingMaxLift) => {
    const raw = (tmValues[lift.exercise_id] ?? '').trim();
    if (!raw) return;
    const kg = Number(raw);
    if (!Number.isFinite(kg) || kg <= 0) {
      toast.error('A training max must be a positive number of kilograms.');
      return;
    }
    if (lift.training_max_kg != null && Number(lift.training_max_kg) === kg) return;
    setTmBusy(true);
    try {
      await api.workoutGenerator.trainingMaxes.set(clientId, lift.exercise_id, { training_max_kg: kg });
      toast.success(`${lift.name} training max saved.`);
      await loadTrainingMaxes();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the training max');
    } finally {
      setTmBusy(false);
    }
  }, [clientId, tmValues, loadTrainingMaxes, toast]);

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      // Blank means "use the application default", not zero. A non-numeric
      // entry is refused rather than coerced to NaN and posted.
      const cardioMinutes = optionalInt(cardio, 0, 180);
      const cardioFrequencyValue = optionalInt(cardioFrequency, 1, 14);
      const ageValue = optionalInt(age, 1, 120);
      const restingHrValue = optionalInt(restingHr, 1, 300);
      const measuredMhrValue = optionalInt(measuredMhr, 1, 300);
      const daysValue = optionalInt(daysPerWeek, 1, 7);
      const minutesValue = optionalInt(sessionMinutes, 20, 180);
      const isBlock = periodization === 'powerlifting_block';
      const blockWeeksValue = isBlock ? optionalInt(blockWeeks, 1, 24) : undefined;
      if (
        [cardioMinutes, cardioFrequencyValue, ageValue, restingHrValue, measuredMhrValue, daysValue, minutesValue, blockWeeksValue]
          .some((value) => Number.isNaN(value))
      ) {
        toast.error('Enter whole numbers: cardio minutes, frequency, age, heart rates, days per week, session minutes and block weeks.');
        return;
      }
      const res = await api.workoutGenerator.preview(clientId, {
        goal: goal || undefined,
        experience: experience || undefined,
        avoidPatterns: avoidPatterns ? avoidPatterns.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        avoidMuscles: avoidMuscles ? avoidMuscles.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        equipment: equipment ? equipment.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        cardioMinutes,
        cardioIntensity: cardioIntensity || undefined,
        cardioMethod: cardioMethod || undefined,
        cardioFrequencyPerWeek: cardioFrequencyValue,
        cardioProgramType: cardioProgram || undefined,
        age: ageValue,
        restingHeartRate: restingHrValue,
        measuredMaxHeartRate: measuredMhrValue,
        daysPerWeek: daysValue,
        sessionMinutes: minutesValue,
        periodization: isBlock ? 'powerlifting_block' : undefined,
        blockWeeks: blockWeeksValue,
      });
      setDraft(res.draft);
      setBlockWeek(1);
      setClientName(res.client.name);
      setWarnings([
        ...(res.validation.ok ? [] : res.validation.problems),
        ...res.draft.warnings,
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate a session');
    } finally {
      setBusy(false);
    }
  }, [
    clientId, goal, experience, avoidPatterns, avoidMuscles, equipment, cardio,
    cardioIntensity, cardioMethod, cardioFrequency, cardioProgram, age, restingHr, measuredMhr,
    daysPerWeek, sessionMinutes, periodization, blockWeeks,
    toast,
  ]);

  useEffect(() => { void generate(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAsPlan = useCallback(async () => {
    if (!draft) return;
    const block = draft.periodization;
    const weeks = block ? block.block_weeks : optionalInt(durationWeeks, 1, 52);
    if (Number.isNaN(weeks)) {
      toast.error('Plan length must be a whole number of weeks between 1 and 52.');
      return;
    }
    // A block stores every week as its own anchor; a single-week plan stores
    // week 1 and lets the progression rule derive the rest.
    const planned = block
      ? block.weeks.flatMap((week) => week.sessions
        .filter((session) => session.mainWork.length)
        .map((session) => ({ week: week.week, session })))
      : draft.sessions
        .filter((session) => session.mainWork.length)
        .map((session) => ({ week: 1, session }));
    if (!planned.length) return;
    const first = planned[0].session;
    setSaving(true);
    try {
      const created = await api.workouts.plans.create({
        name: block
          ? `${clientName || 'Client'} — powerlifting block (generated)`
          : `${clientName || 'Client'} — ${draft.goal.replace(/_/g, ' ')} (generated)`,
        description: [
          block
            ? `Generated ${block.block_weeks}-week powerlifting block: ${block.phases.map((p) => `${p.label} (${p.start_week}–${p.end_week})`).join(', ')}. Review before assigning.`
            : `Generated ${planned.length}-day programme. Review before assigning.`,
          first.conditioning ? `Conditioning: ${first.conditioning.modality} ${first.conditioning.minutes} min.` : null,
          first.warmup.map((w) => `${w.name} ${w.minutes} min`).join('; '),
        ].filter(Boolean).join(' '),
        // The server classifies the goal onto its canonical vocabulary, so the
        // page does not keep a second copy of the list to drift from.
        goal: draft.goal || undefined,
        duration_weeks: weeks ?? 4,
        sessions_per_week: block ? block.weeks[0].sessions.length : planned.length,
        // Block metadata is what makes a saved block resolve to its own weeks
        // instead of deriving every week from week 1's linear rule.
        periodization_model: block ? 'powerlifting_block' : undefined,
        split_name: block ? `${block.weeks[0].sessions.length}-day powerlifting split` : undefined,
        block_phases: block
          ? block.weeks.map((week) => ({
            week: week.week,
            phase: week.phase,
            label: week.label,
            is_deload: week.is_deload,
            week_in_phase: week.week_in_phase,
            phase_weeks: week.phase_weeks,
          }))
          : undefined,
        // Protocols are plan-level; every generated session shares the same
        // warm-up and cool-down.
        warmup_protocol: first.warmup,
        cooldown_protocol: first.cooldown,
        exercises: planned.flatMap(({ week, session }) => planRows(session, week)),
      });

      try {
        await api.workouts.assign({ workout_plan_id: created.plan.id, client_id: clientId });
      } catch (e) {
        // The plan exists; saying "could not save" would be a lie and would
        // invite the trainer to create a duplicate.
        toast.error(`Plan saved, but assigning it failed: ${e instanceof Error ? e.message : 'unknown error'}`);
        router.push(`/pt-os/workout-plans?client_id=${clientId}`);
        return;
      }
      toast.success(`Plan saved and assigned to ${clientName || 'the client'}.`);
      router.push(`/pt-os/clients/${clientId}/training/assigned`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the plan');
    } finally {
      setSaving(false);
    }
  }, [draft, clientName, clientId, durationWeeks, router, toast]);

  const previewWeek = draft?.periodization?.weeks.find((week) => week.week === blockWeek) ?? null;
  const previewSessions = previewWeek ? previewWeek.sessions : draft?.sessions ?? [];
  const canSave = draft?.periodization
    ? draft.periodization.weeks.some((week) => week.sessions.some((session) => session.mainWork.length))
    : (draft?.sessions ?? []).some((session) => session.mainWork.length);

  return (
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} color="#fff" />}
        title="Workout Generator"
        subtitle="Rule-based programme with powerlifting blocks and training maxes."
      />

      <p className="mb-4 text-[12.5px]">
        <Link
          href={`/ai/workout-generator${clientId ? `?client_id=${clientId}` : ''}`}
          className="font-[700]"
          style={{ color: 'var(--brand)' }}
        >
          Open the AI Workout Generator →
        </Link>
      </p>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Goal">
          <SelectInput value={goal} onChange={(e) => setGoal(e.target.value)}>
            {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </SelectInput>
        </FormField>
        <FormField label="Experience">
          <SelectInput value={experience} onChange={(e) => setExperience(e.target.value)}>
            {EXPERIENCE.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </SelectInput>
        </FormField>
        <FormField label="Avoid movement patterns">
          <TextInput value={avoidPatterns} onChange={(e) => setAvoidPatterns(e.target.value)} />
        </FormField>
        <FormField label="Avoid muscles">
          <TextInput value={avoidMuscles} onChange={(e) => setAvoidMuscles(e.target.value)} />
        </FormField>
        <FormField label="Available equipment">
          <TextInput value={equipment} onChange={(e) => setEquipment(e.target.value)} />
        </FormField>
        <FormField label="Days per week">
          <TextInput inputMode="numeric" min={1} max={7} value={daysPerWeek}
            onChange={(e) => setDaysPerWeek(e.target.value)} />
        </FormField>
        <FormField label="Session minutes">
          <TextInput inputMode="numeric" min={20} max={180} value={sessionMinutes}
            onChange={(e) => setSessionMinutes(e.target.value)} />
        </FormField>
        <FormField label="Periodisation">
          <SelectInput value={periodization} onChange={(e) => setPeriodization(e.target.value)}>
            <option value="">Single week (linear)</option>
            <option value="powerlifting_block">Powerlifting block</option>
          </SelectInput>
        </FormField>
        {periodization === 'powerlifting_block' ? (
          <FormField label="Block length (weeks)">
            <TextInput inputMode="numeric" min={1} max={24} value={blockWeeks}
              onChange={(e) => setBlockWeeks(e.target.value)} />
          </FormField>
        ) : (
          <FormField label="Plan length (weeks)">
            <TextInput inputMode="numeric" min={1} max={52} value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)} />
          </FormField>
        )}
      </div>

      {periodization === 'powerlifting_block' && (
        <section className="mb-5 rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
          <h2 className="mb-1 text-[15px] font-[700]">Training maxes</h2>
          <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Every competition lift is loaded as a percentage of the max you set here.
            A suggestion from logged sets is advice, never applied automatically; a lift
            with no max is prescribed by RPE instead.
          </p>
          {tmLifts.length === 0 ? (
            <p className="text-[13px]">No competition lifts (squat, bench, deadlift) were found in this studio&apos;s library.</p>
          ) : (
            <ul className="space-y-3">
              {tmLifts.map((lift) => (
                <li key={lift.exercise_id} className="rounded-[12px] border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-[600]">{lift.name}</span>
                    <span className="rounded-full bg-[#A33757]/10 px-2 py-0.5 text-[11px] uppercase">{lift.lift}</span>
                    <TextInput inputMode="decimal" className="w-24" value={tmValues[lift.exercise_id] ?? ''}
                      onChange={(e) => setTmValues((prev) => ({ ...prev, [lift.exercise_id]: e.target.value }))}
                      placeholder="kg" />
                    <Button size="sm" variant="outline" onClick={() => saveTrainingMax(lift)} disabled={tmBusy}>
                      Save max
                    </Button>
                    {lift.suggestion.suggested_kg != null && lift.suggestion.suggested_kg !== lift.training_max_kg && (
                      <Button size="sm" variant="ghost"
                        onClick={() => setTmValues((prev) => ({
                          ...prev,
                          [lift.exercise_id]: String(lift.suggestion.suggested_kg),
                        }))}>
                        Use {lift.suggestion.suggested_kg} kg
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {lift.suggestion.reason}
                    {lift.best_e1rm_kg != null ? ` Best logged e1RM: ${lift.best_e1rm_kg} kg${lift.best_e1rm_date ? ` (${lift.best_e1rm_date})` : ''}.` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mb-5 rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
        <h2 className="mb-1 text-[15px] font-[700]">Cardio prescription (optional)</h2>
        <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Blank fields keep the application defaults. A target heart rate appears only when
          age or measured max HR is supplied together with resting HR; the generator never invents one.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Cardio minutes">
            <TextInput inputMode="numeric" min={0} max={180} value={cardio}
              onChange={(e) => setCardio(e.target.value)} />
          </FormField>
          <FormField label="K11 intensity">
            <SelectInput value={cardioIntensity} onChange={(e) => setCardioIntensity(e.target.value)}>
              <option value="">Application default (moderate)</option>
              {K11_INTENSITY_BANDS.map((band) => (
                <option key={band.key} value={band.key}>{band.label}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Target calculation">
            <SelectInput value={cardioMethod} onChange={(e) => setCardioMethod(e.target.value)}>
              <option value="">Application default (Karvonen)</option>
              <option value="mhr">MHR: THR = MHR × %</option>
              <option value="karvonen">Karvonen: THR = ((MHR − RHR) × %) + RHR</option>
            </SelectInput>
          </FormField>
          <FormField label="Frequency per week">
            <TextInput inputMode="numeric" min={1} max={14} value={cardioFrequency}
              onChange={(e) => setCardioFrequency(e.target.value)} />
          </FormField>
          <FormField label="Programme type">
            <SelectInput value={cardioProgram} onChange={(e) => setCardioProgram(e.target.value)}>
              <option value="">Application default (Continuous / LISS)</option>
              {CARDIO_PROGRAM_TYPES.map((type) => (
                <option key={type.key} value={type.key}>{type.label}</option>
              ))}
            </SelectInput>
          </FormField>
          <FormField label="Age (MHR estimate)">
            <TextInput inputMode="numeric" min={1} max={120} value={age}
              onChange={(e) => setAge(e.target.value)} />
          </FormField>
          <FormField label="Resting HR">
            <TextInput inputMode="numeric" min={1} value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)} />
          </FormField>
          <FormField label="Measured max HR">
            <TextInput inputMode="numeric" min={1} value={measuredMhr}
              onChange={(e) => setMeasuredMhr(e.target.value)} />
          </FormField>
        </div>
      </section>

      <Button onClick={generate} disabled={busy} className="mb-6">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Generate
      </Button>

      {warnings.length > 0 && (
        <div className="mb-4 rounded-[12px] border border-[#f59e0b]/40 bg-[#f59e0b]/10 p-3 text-[13px]">
          {warnings.map((w) => <div key={w} className="flex items-center gap-2"><AlertTriangle size={14} /> {w}</div>)}
        </div>
      )}

      {draft && (
        <div className="space-y-5">
          {draft.periodization && (
            <section className="rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
              <h2 className="mb-1 text-[15px] font-[700]">
                Powerlifting block — {draft.periodization.block_weeks} weeks
              </h2>
              <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {draft.periodization.phases
                  .map((phase) => `${phase.label} (weeks ${phase.start_week}–${phase.end_week})`)
                  .join(' → ')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draft.periodization.weeks.map((week) => (
                  <button
                    key={week.week}
                    type="button"
                    onClick={() => setBlockWeek(week.week)}
                    className="rounded-[9px] border px-2.5 py-1 text-[12px] font-[600]"
                    style={blockWeek === week.week
                      ? { borderColor: 'transparent', background: '#A33757', color: '#fff' }
                      : { borderColor: week.is_deload ? '#f59e0b' : 'var(--border)' }}
                  >
                    {week.week}{week.is_deload ? ' · deload' : ''}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[12px]">
                <strong>Loaded from:</strong>{' '}
                {draft.periodization.training_maxes.length
                  ? draft.periodization.training_maxes
                    .map((tm) => `${tm.name} ${tm.training_max_kg} kg`)
                    .join(', ')
                  : 'no training maxes — every competition lift is prescribed by RPE.'}
              </p>
              {draft.periodization.missing_training_maxes.length > 0 && (
                <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  No max for {draft.periodization.missing_training_maxes.map((tm) => tm.name).join(', ')}.
                  Set one above, then regenerate to load those lifts by percentage.
                </p>
              )}
            </section>
          )}

          {previewWeek && (
            <p className="text-[13px] font-[600]">
              Week {previewWeek.week} — {previewWeek.label}
              {previewWeek.is_deload ? ' (deload)' : ''}
            </p>
          )}

          {previewSessions.map((session, index) => (
            <SessionCard
              key={`${previewWeek?.week ?? 1}-${session.day_of_week}-${index}`}
              session={session}
              index={index}
              total={previewSessions.length}
            />
          ))}

          {draft.excluded.length > 0 && (
            <section>
              <h2 className="mb-2 text-[15px] font-[700]">Left out ({draft.excluded.length})</h2>
              <ul className="space-y-1 text-[12px] opacity-80">
                {draft.excluded.map((e) => <li key={e.id}>{e.name} — {e.reason}</li>)}
              </ul>
            </section>
          )}

          <Button onClick={saveAsPlan} disabled={saving || !canSave}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save plan &amp; assign
          </Button>
        </div>
      )}
    </PageContainer>
  );
}

/** One generated training day: warm-up, main work, conditioning, cool-down. */
function SessionCard({ session, index, total }: { session: GeneratedSession; index: number; total: number }) {
  const fitt = session.conditioning?.fitt;
  const target = session.conditioning?.targetHeartRate;
  const intensityBand = fitt ? getK11IntensityBand(fitt.intensity) : null;
  const program = fitt ? CARDIO_PROGRAM_TYPES.find((type) => type.key === fitt.programType) : null;
  const defaultKeys = fitt
    ? fitt.defaults ?? (fitt.basis === 'application-default'
      ? ['intensity', 'frequency', 'programme'] as const
      : [])
    : [];
  const defaultLabels = defaultKeys.map((key) => ({
    intensity: 'Intensity',
    frequency: 'Frequency',
    programme: 'Programme',
  })[key]);
  const defaultVerb = defaultLabels.length === 1 ? 'uses' : 'use';

  return (
    <section className="rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-[700]">
          {total > 1 ? `${index + 1}. ${session.day_name} — ${session.focus}` : session.name}
        </h2>
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          ~{session.estimated_minutes} min · {session.mainWork.length} exercises
        </span>
      </div>

      <h3 className="mb-1 text-[13px] font-[700]">Warm-up</h3>
      <ul className="space-y-1 text-[13px]">
        {session.warmup.map((w) => <li key={w.name}><strong>{w.name}</strong> · {w.minutes} min — {w.notes}</li>)}
      </ul>

      <h3 className="mb-1 mt-3 text-[13px] font-[700]">Main work ({session.mainWork.length})</h3>
      {session.mainWork.length === 0 && <p className="text-[13px]">No suitable exercises were found with these restrictions.</p>}
      <ol className="space-y-2">
        {session.mainWork.map((ex, i) => (
          <li key={ex.id} className="rounded-[12px] border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[14px] font-[600]">{i + 1}. {ex.name}</span>
              <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#A33757]/10">{ex.phase}</span>
            </div>
            <div className="mt-1 text-[12px]">
              {ex.prescription.sets} sets × {ex.prescription.reps} reps · rest {ex.prescription.restSeconds}s
              {ex.prescription.target_weight != null ? ` · ${ex.prescription.target_weight} kg` : ''}
              {ex.prescription.rpe != null ? ` · RPE ${ex.prescription.rpe}` : ''}
              {ex.prescription.rir != null ? ` · RIR ${ex.prescription.rir}` : ''}
              {ex.prescription.intensityPct1RM ? ` · ${ex.prescription.intensityPct1RM}% 1RM` : ''}
            </div>
            <div className="mt-1 flex items-start gap-1 text-[12px] opacity-80"><Info size={12} className="mt-0.5" /> {ex.reason} {ex.prescription.notes}</div>
          </li>
        ))}
      </ol>

      {session.conditioning && (
        <>
          <h3 className="mb-1 mt-3 text-[13px] font-[700]">Conditioning</h3>
          <p className="text-[13px]">
            {session.conditioning.modality} · {session.conditioning.minutes} min ·{' '}
            {intensityBand?.label ?? session.conditioning.intensity} — {session.conditioning.notes}
          </p>
          {fitt && (
            <dl className="mt-2 grid gap-2 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <dt className="font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Frequency</dt>
                <dd className="mt-0.5 font-[750]">{fitt.frequencyPerWeek}×/week</dd>
              </div>
              <div className="rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <dt className="font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Main work</dt>
                <dd className="mt-0.5 font-[750]">{fitt.timeMinutes} min</dd>
              </div>
              <div className="rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <dt className="font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Intensity</dt>
                <dd className="mt-0.5 font-[750]">{intensityBand?.label ?? fitt.intensity}</dd>
              </div>
              <div className="rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
                <dt className="font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Programme</dt>
                <dd className="mt-0.5 font-[750]">{program?.label ?? fitt.programType}</dd>
              </div>
            </dl>
          )}
          <p className="mt-2 text-[12px]">
            <strong>Target heart rate:</strong>{' '}
            {target
              ? `${target.minBpm}–${target.maxBpm} BPM (${target.basisLabel} · ${target.method === 'mhr' ? 'MHR method' : 'Karvonen method'})`
              : 'Not set. Supply age or measured max HR together with resting HR; no BPM is invented.'}
          </p>
          {defaultLabels.length > 0 && (
            <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {defaultLabels.join(', ')} {defaultVerb} application defaults, not K11 limits.
            </p>
          )}
          {(session.conditioning.warnings?.length ?? 0) > 0 && (
            <ul className="mt-2 space-y-1 text-[12px]" style={{ color: 'var(--danger-text, #b91c1c)' }}>
              {session.conditioning.warnings?.map((warning) => (
                <li key={warning} className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {warning}</li>
              ))}
            </ul>
          )}
        </>
      )}

      <h3 className="mb-1 mt-3 text-[13px] font-[700]">Cool-down</h3>
      <ul className="space-y-1 text-[13px]">
        {session.cooldown.map((w) => <li key={w.name}><strong>{w.name}</strong> · {w.minutes} min — {w.notes}</li>)}
      </ul>
    </section>
  );
}

function PickClient() {
  return (
    <ClientPicker
      title="Workout Generator"

      icon={<Dumbbell size={20} color="#fff" />}
      basePath="/pt-os/workout-generator"
    />
  );
}

function GeneratorPage() {
  const params = useSearchParams();
  const clientId = params.get('client_id');
  return <Guard roles={['trainer']}>{clientId ? <GeneratorScreen clientId={clientId} /> : <PickClient />}</Guard>;
}

export default function Page() {
  return <Suspense fallback={null}><GeneratorPage /></Suspense>;
}
