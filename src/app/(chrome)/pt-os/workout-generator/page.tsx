'use client';
/**
 * Trainer-facing workout generator.
 *
 * The rules engine on the server picks, sequences and prescribes; this page is
 * the review surface. Nothing is saved until the trainer presses save, and
 * what is saved goes through the existing plan endpoints and lands on the
 * assign surface — so a generated session is assigned exactly like a
 * hand-built one, instead of being left in a builder nobody is on.
 *
 * The draft is a suggestion, not a verdict: excluded exercises are shown with
 * the reason they were left out, so "why isn't the deadlift here" is answered
 * on the screen instead of in the trainer's head.
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import type { GeneratedWorkout } from '@/lib/workout-generator';

const GOALS = [
  { value: '', label: 'Use client goal' },
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General fitness' },
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

function GeneratorScreen({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [avoidPatterns, setAvoidPatterns] = useState('');
  const [avoidMuscles, setAvoidMuscles] = useState('');
  const [equipment, setEquipment] = useState('');
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
      if (
        [cardioMinutes, cardioFrequencyValue, ageValue, restingHrValue, measuredMhrValue]
          .some((value) => Number.isNaN(value))
      ) {
        toast.error('Enter whole numbers for cardio minutes, frequency, age and heart rates.');
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
      });
      setDraft(res.draft);
      setClientName(res.client.name);
      setWarnings(res.validation.ok ? [] : res.validation.problems);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not generate a session');
    } finally {
      setBusy(false);
    }
  }, [
    clientId, goal, experience, avoidPatterns, avoidMuscles, equipment, cardio,
    cardioIntensity, cardioMethod, cardioFrequency, cardioProgram, age, restingHr, measuredMhr,
    toast,
  ]);

  useEffect(() => { void generate(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAsPlan = useCallback(async () => {
    if (!draft || !draft.mainWork.length) return;
    setSaving(true);
    try {
      await api.workouts.plans.create({
        name: `${clientName || 'Client'} — ${draft.goal.replace('_', ' ')} (generated)`,
        description: [
          'Generated session. Review before assigning.',
          draft.conditioning ? `Conditioning: ${draft.conditioning.modality} ${draft.conditioning.minutes} min.` : null,
          draft.warmup.map((w) => `${w.name} ${w.minutes} min`).join('; '),
        ].filter(Boolean).join(' '),
        goal: ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness', 'recovery'].includes(draft.goal) ? draft.goal : undefined,
        duration_weeks: 4,
        sessions_per_week: 1,
        exercises: draft.mainWork.map((ex, i) => ({
          exercise_id: ex.id,
          day_of_week: 1,
          sort_order: i + 1,
          sets: ex.prescription.sets,
          reps: repsLowerBound(ex.prescription.reps),
          rest_seconds: ex.prescription.restSeconds,
          notes: `${ex.reason} Prescribed ${ex.prescription.reps} reps, RPE ${ex.prescription.rpe ?? '—'}${
            ex.prescription.intensityPct1RM ? `, ${ex.prescription.intensityPct1RM}% 1RM` : ''
          }.`,
        })),
      });
      toast.success(`Plan saved — assign it to ${clientName || 'the client'}.`);
      router.push(`/pt-os/workout-plans?client_id=${clientId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save the plan');
    } finally {
      setSaving(false);
    }
  }, [draft, clientName, clientId, router, toast]);

  const fitt = draft?.conditioning?.fitt;
  const target = draft?.conditioning?.targetHeartRate;
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
    <PageContainer>
      <PageHero
        icon={<Dumbbell size={20} color="#fff" />}
        title="Workout Generator"

      />

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
          <TextInput value={avoidPatterns} onChange={(e) => setAvoidPatterns(e.target.value)}
            placeholder="Squat, Hinge (comma separated)" />
        </FormField>
        <FormField label="Avoid muscles">
          <TextInput value={avoidMuscles} onChange={(e) => setAvoidMuscles(e.target.value)}
            placeholder="Shoulders, Lower Back" />
        </FormField>
        <FormField label="Available equipment">
          <TextInput value={equipment} onChange={(e) => setEquipment(e.target.value)}
            placeholder="Barbell, Dumbbell (blank = all)" />
        </FormField>
      </div>

      <section className="mb-5 rounded-[14px] border p-4" style={{ borderColor: 'var(--border)' }}>
        <h2 className="mb-1 text-[15px] font-[700]">Cardio prescription (optional)</h2>
        <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Blank fields keep the application defaults. A target heart rate appears only when
          age or measured max HR is supplied together with resting HR; the generator never invents one.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Cardio minutes">
            <TextInput inputMode="numeric" min={0} max={180} value={cardio}
              onChange={(e) => setCardio(e.target.value)} placeholder="Goal default" />
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
              onChange={(e) => setCardioFrequency(e.target.value)} placeholder="Application default (3)" />
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
              onChange={(e) => setAge(e.target.value)} placeholder="Not supplied" />
          </FormField>
          <FormField label="Resting HR">
            <TextInput inputMode="numeric" min={1} value={restingHr}
              onChange={(e) => setRestingHr(e.target.value)} placeholder="Not supplied" />
          </FormField>
          <FormField label="Measured max HR">
            <TextInput inputMode="numeric" min={1} value={measuredMhr}
              onChange={(e) => setMeasuredMhr(e.target.value)} placeholder="Not supplied" />
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
          <section>
            <h2 className="mb-2 text-[15px] font-[700]">Warm-up</h2>
            <ul className="space-y-1 text-[13px]">
              {draft.warmup.map((w) => <li key={w.name}><strong>{w.name}</strong> · {w.minutes} min — {w.notes}</li>)}
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-[15px] font-[700]">Main work ({draft.mainWork.length})</h2>
            {draft.mainWork.length === 0 && <p className="text-[13px]">No suitable exercises were found with these restrictions.</p>}
            <ol className="space-y-2">
              {draft.mainWork.map((ex, i) => (
                <li key={ex.id} className="rounded-[12px] border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-[600]">{i + 1}. {ex.name}</span>
                    <span className="text-[12px] px-2 py-0.5 rounded-full bg-[#5B63F6]/10">{ex.phase}</span>
                  </div>
                  <div className="mt-1 text-[12px]">
                    {ex.prescription.sets} sets × {ex.prescription.reps} reps · rest {ex.prescription.restSeconds}s
                    {ex.prescription.rpe != null ? ` · RPE ${ex.prescription.rpe}` : ''}
                    {ex.prescription.intensityPct1RM ? ` · ${ex.prescription.intensityPct1RM}% 1RM` : ''}
                  </div>
                  <div className="mt-1 flex items-start gap-1 text-[12px] opacity-80"><Info size={12} className="mt-0.5" /> {ex.reason} {ex.prescription.notes}</div>
                </li>
              ))}
            </ol>
          </section>

          {draft.conditioning && (
            <section>
              <h2 className="mb-2 text-[15px] font-[700]">Conditioning</h2>
              <p className="text-[13px]">
                {draft.conditioning.modality} · {draft.conditioning.minutes} min ·{' '}
                {intensityBand?.label ?? draft.conditioning.intensity} — {draft.conditioning.notes}
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
              {(draft.conditioning.warnings?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1 text-[12px]" style={{ color: 'var(--danger-text, #b91c1c)' }}>
                  {draft.conditioning.warnings?.map((warning) => (
                    <li key={warning} className="flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> {warning}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <h2 className="mb-2 text-[15px] font-[700]">Cool-down</h2>
            <ul className="space-y-1 text-[13px]">
              {draft.cooldown.map((w) => <li key={w.name}><strong>{w.name}</strong> · {w.minutes} min — {w.notes}</li>)}
            </ul>
          </section>

          {draft.excluded.length > 0 && (
            <section>
              <h2 className="mb-2 text-[15px] font-[700]">Left out ({draft.excluded.length})</h2>
              <ul className="space-y-1 text-[12px] opacity-80">
                {draft.excluded.map((e) => <li key={e.id}>{e.name} — {e.reason}</li>)}
              </ul>
            </section>
          )}

          <Button onClick={saveAsPlan} disabled={saving || !draft.mainWork.length}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save plan &amp; assign
          </Button>
        </div>
      )}
    </PageContainer>
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
