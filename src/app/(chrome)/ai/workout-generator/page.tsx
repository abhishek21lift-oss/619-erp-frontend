'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Dumbbell, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw, Flame, Clock, Target } from 'lucide-react';
import { m, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type {
  AiWorkoutPlan, AiWorkoutDay, AiWorkoutExercise, AiWorkoutGenerationResult, SavedFromGeneration,
} from '@/lib/api';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { errorMessage, generationErrorMessage } from '@/lib/forms/errors';
import {
  NumberField, SelectField, TextField, ChoiceChips, useStandaloneField,
} from '@/components/ui/form';
import { aiWorkoutInputSchema, stated } from '@/lib/forms/schemas/aiGenerator';
import { AiClientPicker, type AiClientOption } from '@/components/ai/AiClientPicker';
import { applyFacts, hasAnyFact, useAiClientPrefill } from '@/lib/ai-client-prefill';
import GenerationEvidence from '@/components/pt-os/GenerationEvidence';

const ACCENT = '#A33757';
const ACCENT_SOFT = '#A33757';
const ACCENT_DIM = 'rgba(163,55,87,0.10)';
const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT_SOFT}, ${ACCENT})`;

/**
 * The form before anyone — trainer or record — has stated anything.
 *
 * It used to start at male / general_fitness / beginner / gym / four days and
 * send all five as trainer-stated facts. Nobody typed them; for a client whose
 * record was thin they became the programme's inputs anyway. Blank now means
 * blank: the server's record is the authority, and an omitted field tells it
 * so.
 */
const INITIAL_FORM = {
  age: '', gender: '', weight_kg: '', height_cm: '',
  goal: '', experience_level: '', injuries: '', training_days: '',
  // Not a fact about the client: how long a block the trainer wants. Blank
  // until they say, so the server's own default applies.
  duration_weeks: '',
};

/** The parts of a generation result this page keeps and shows. */
type Meta = Pick<
  AiWorkoutGenerationResult,
  'model' | 'tier' | 'used_fallback' | 'grounding' | 'audit'
  | 'quality' | 'critique' | 'critique_verdict' | 'screen'
>;

// The nine goals the programming engines and workout_plans.goal share.
const GOALS = [
  'hypertrophy', 'strength', 'fat_loss', 'endurance', 'general_fitness',
  'body_recomposition', 'recovery', 'flexibility_mobility', 'powerlifting',
];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];

const labelMap: Record<string, string> = {
  hypertrophy: 'Hypertrophy', strength: 'Strength', fat_loss: 'Fat Loss',
  endurance: 'Endurance', general_fitness: 'General Fitness',
  body_recomposition: 'Body Recomposition', recovery: 'Recovery',
  flexibility_mobility: 'Flexibility & Mobility', powerlifting: 'Powerlifting',
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
  male: 'Male', female: 'Female', other: 'Other',
};

const LOADING_STEPS = [
  'Analysing your profile…',
  'Selecting movements for your equipment…',
  'Balancing volume across the week…',
  'Applying progressive overload…',
  'Writing your programme…',
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── Result atoms ───────────────────────────────────────────────────────── */
function ExerciseRow({ ex, index }: { ex: AiWorkoutExercise; index: number }) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] px-4 py-3"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-[700]"
        style={{ background: ACCENT_DIM, color: ACCENT }}>{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-[650]" style={{ color: 'var(--text-primary)' }}>{ex.name}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-md px-2 py-0.5 text-[11px] font-[700]" style={{ background: ACCENT_DIM, color: ACCENT }}>
            {ex.sets} × {ex.reps}
          </span>
          {ex.tempo && (
            <span className="rounded-md px-2 py-0.5 text-[11px] font-[600]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Tempo {ex.tempo}
            </span>
          )}
          {ex.rest_seconds ? (
            <span className="rounded-md px-2 py-0.5 text-[11px] font-[600]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Rest {ex.rest_seconds}s
            </span>
          ) : null}
        </div>
        {ex.notes && <div className="mt-1.5 text-[11.5px] italic" style={{ color: 'var(--text-disabled)' }}>{ex.notes}</div>}
      </div>
    </div>
  );
}

function DayCard({ dayKey, day, index }: { dayKey: string; day: AiWorkoutDay; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <m.div variants={fadeUp} initial="hidden" animate="show" custom={index}
      className="overflow-hidden rounded-[18px] transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.07)]"
      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <button onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[11px] text-[12px] font-[800] capitalize"
            style={{ background: open ? ACCENT_GRADIENT : ACCENT_DIM, color: open ? '#fff' : ACCENT }}>
            {dayKey.slice(0, 2)}
          </span>
          <div>
            <span className="text-[14px] font-[750] capitalize" style={{ color: 'var(--text-primary)' }}>{dayKey}</span>
            <span className="ml-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>{day.focus}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <span className="rounded-full px-2.5 py-1 text-[11.5px] font-[700]" style={{ background: ACCENT_DIM, color: ACCENT }}>
            {day.exercises?.length ?? 0}
          </span>
          {open ? <ChevronUp size={16} style={{ color: 'var(--text-disabled)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-disabled)' }} />}
        </div>
      </button>
      {open && (
        <div className="flex flex-col gap-2 px-4 pb-4">
          {day.exercises?.map((ex, i) => <ExerciseRow key={i} ex={ex} index={i} />)}
        </div>
      )}
    </m.div>
  );
}

function NoteCard({ title, text, index }: { title: string; text: string | string[]; index: number }) {
  // The prompt asks for these as ordered lists; an older string contract is
  // still accepted. `whitespace-pre-line` keeps the steps on separate lines.
  const body = (Array.isArray(text) ? text.join('\n') : text).trim();
  if (!body) return null;
  return (
    <m.div variants={fadeUp} initial="hidden" animate="show" custom={index}
      className="rounded-[18px] px-5 py-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="mb-2 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: ACCENT }}>{title}</div>
      <p className="m-0 whitespace-pre-line text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{body}</p>
    </m.div>
  );
}

/**
 * The one 409 the page can answer: the client is already on a live programme
 * and the server refuses to choose between progressing it and starting a new
 * one. Everything else stays an ordinary error.
 */
function activeProgramFrom(err: unknown): { message: string } | null {
  const e = err as {
    status?: number;
    code?: string;
    message?: string;
    payload?: { program?: { plan_name?: string } };
  };
  if (e?.status !== 409 || e.code !== 'ACTIVE_PROGRAM') return null;
  return {
    message: e.message
      || `${e.payload?.program?.plan_name ?? 'A programme'} is active. Choose whether to progress it or start a new one.`,
  };
}

/**
 * The other 409 this page can answer: nobody has screened this client. The
 * server accepts an explicit trainer override (`acknowledge_unscreened`), and
 * refusing here would leave every client without a PAR-Q unable to generate at
 * all. The decision stays with the trainer — it is a button, not a default.
 */
function clearanceFrom(err: unknown): { message: string } | null {
  const e = err as { status?: number; code?: string };
  if (e?.status !== 409 || e.code !== 'CLEARANCE_REQUIRED') return null;
  return {
    message: 'This client has no health screening on file. Generate anyway only if you have assessed them yourself — the programme will be written without a screen.',
  };
}

/** A cancel is not a failure. */
const isAbort = (err: unknown) => (err as { name?: string })?.name === 'AbortError';

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function WorkoutGeneratorPage() {
  // ── This page needs a client, and used to pretend otherwise ──────────────
  //
  // /api/ai/workout/generate requires a client_id: the server resolves the
  // client's real facts from their record rather than trusting a form. This
  // page never sent one, so every generation from it answered 400 "client_id
  // is required" — while the nav, the landing page, the AI Coach shortcuts and
  // the client profile all linked to it. The profile link already carries
  // ?client_id=, which is the one caller that would have worked.
  //
  // So: the id comes from the query string when a profile, the assistant
  // or the AI Coach sends one — and from the picker below when the page is
  // opened bare from the nav or the landing page, where no client is known.
  const linkedClientId = useSearchParams().get('client_id');
  const [pickedClient, setPickedClient] = useState<AiClientOption | null>(null);
  // A pick beats the query string: when the linked id no longer resolves (the
  // client was deleted, the link is stale) the picker is the only way out, and
  // it can only work if choosing actually changes the id.
  const clientId = pickedClient ? String(pickedClient.id) : linkedClientId;
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [plan, setPlan] = useState<AiWorkoutPlan | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedFromGeneration | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [activeProgram, setActiveProgram] = useState<{ message: string } | null>(null);
  const [clearance, setClearance] = useState<{ message: string } | null>(null);
  const [error, setError] = useState('');
  /** Stops the trainer waiting; the server finishes the call it was billed for. */
  const abortRef = useRef<AbortController | null>(null);
  /** The action that produced the last request, so an override repeats it. */
  const lastModeRef = useRef<'new' | 'adapt' | undefined>(undefined);
  /** Per-field messages from the schema. Populated only by a generate ATTEMPT. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /**
   * A same-frame re-entry guard.
   *
   * `loading` is state, so two taps in one frame both read false and both fire
   * the request — and a generation is a billed model call, not a no-op.
   */
  const generatingRef = useRef(false);
  /** The same guard for saving: two taps must not accept one proposal twice. */
  const savingRef = useRef(false);

  const set = (k: string, v: string) => {
    editedRef.current.add(k);
    setForm((f) => ({ ...f, [k]: v }));
  };

  /**
   * Fields the trainer has edited by hand. Auto-fill only ever supplies a
   * field nobody has touched — the record informs the form, it does not
   * overrule the person using it. Switching clients clears the set, because
   * edits to the OLD client's form must not shadow the new client's record.
   */
  const editedRef = useRef(new Set<string>());
  const prefill = useAiClientPrefill(clientId);

  /**
   * The studio's equipment, recorded once and read by every generation.
   *
   * The prompt gets equipment from `system_settings.studio_equipment`; no
   * screen wrote that key, so every plan selected its exercises for an
   * imagined commercial gym. This page is where a trainer already is when the
   * omission shows, so it is where the field lives.
   */
  const [studioEquipment, setStudioEquipment] = useState('');
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [equipmentSaved, setEquipmentSaved] = useState(false);
  useEffect(() => {
    let alive = true;
    api.settings.getAll()
      .then((r) => { if (alive) setStudioEquipment(String(r.settings?.studio_equipment ?? '')); })
      .catch(() => {
        // Saving the blank field would replace a record this read could not see.
        if (alive) setError('Could not load the studio equipment — saving will replace what is already recorded.');
      });
    return () => { alive = false; };
  }, []);
  const saveEquipment = async () => {
    setSavingEquipment(true);
    setEquipmentSaved(false);
    try {
      await api.settings.update({ studio_equipment: studioEquipment.trim() });
      setEquipmentSaved(true);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Could not save the studio equipment.'));
    } finally {
      setSavingEquipment(false);
    }
  };

  const shownClientRef = useRef<string | null>(clientId);
  useEffect(() => {
    if (shownClientRef.current === clientId) return;
    shownClientRef.current = clientId;
    editedRef.current.clear();
    setForm(INITIAL_FORM);
    // A proposal belongs to the client it was generated for. Leaving it on
    // screen would let a save write to the old client while the page names
    // the new one.
    setPlan(null);
    setMeta(null);
    setGenerationId(null);
    setSaved(null);
    setSaveError('');
    setActiveProgram(null);
    setClearance(null);
    setError('');
  }, [clientId]);

  useEffect(() => {
    if (!prefill.facts) return;
    setForm((f) => applyFacts(f, prefill.facts!.workout, editedRef.current));
  }, [prefill.facts]);


  const ageField = useStandaloneField('age', form.age, (v: string) => set('age', v), { error: fieldErrors.age });
  const weightField = useStandaloneField('weight_kg', form.weight_kg, (v: string) => set('weight_kg', v), { error: fieldErrors.weight_kg });
  const heightField = useStandaloneField('height_cm', form.height_cm, (v: string) => set('height_cm', v), { error: fieldErrors.height_cm });
  const goalField = useStandaloneField('goal', form.goal, (v: string) => set('goal', v), { error: fieldErrors.goal });
  const studioEquipmentField = useStandaloneField(
    'studio_equipment', studioEquipment,
    (v: string) => { setStudioEquipment(v); setEquipmentSaved(false); },
  );
  const injuriesField = useStandaloneField('injuries', form.injuries, (v: string) => set('injuries', v), { error: fieldErrors.injuries });
  const genderField = useStandaloneField('gender', form.gender, (v: string) => set('gender', v), { error: fieldErrors.gender });
  const experienceField = useStandaloneField('experience_level', form.experience_level, (v: string) => set('experience_level', v), { error: fieldErrors.experience_level });
  const trainingDaysField = useStandaloneField('training_days', form.training_days, (v: string) => set('training_days', v), { error: fieldErrors.training_days });
  const durationField = useStandaloneField('duration_weeks', form.duration_weeks, (v: string) => set('duration_weeks', v));

  useEffect(() => {
    if (!loading) { setLoadStep(0); return; }
    const t = setInterval(() => setLoadStep((s) => (s + 1) % LOADING_STEPS.length), 2600);
    return () => clearInterval(t);
  }, [loading]);

  /**
   * `mode` is only ever sent in answer to the server's 409: the client is on a
   * live programme and "progress it" or "start a new one" is the trainer's
   * call, not a default this page may invent.
   */
  const handleGenerate = async (mode?: 'new' | 'adapt', acknowledgeUnscreened = false) => {
    if (generatingRef.current) return;
    if (!clientId) {
      setError('Select a client above — a programme is written for a specific client.');
      return;
    }
    lastModeRef.current = mode;

    /*
     * Everything below `client_id` is OPTIONAL and means one thing: the
     * trainer is stating a value for a client whose record does not hold it.
     * The server prefers its own record every time and marks what it took from
     * here as stated, never as a fact about the client.
     *
     * What it will not do is print an impossible one. A weight of 750 or an
     * age of 9999 used to reach the prompt verbatim and the model wrote a
     * programme around it; the server refuses both now, silently, by treating
     * them as absent. Refusing them HERE is what turns that silence into a
     * correction — and saves a billed generation.
     */
    const parsed = aiWorkoutInputSchema.safeParse({
      age: form.age,
      weight_kg: form.weight_kg,
      height_cm: form.height_cm,
      training_days: form.training_days,
      injuries: form.injuries,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!(key in next)) next[key] = issue.message;
      }
      setFieldErrors(next);
      setError('Check the highlighted fields before generating.');
      return;
    }
    setFieldErrors({});

    generatingRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(''); setLoading(true); setPlan(null); setMeta(null);
    setGenerationId(null); setSaved(null); setSaveError(''); setActiveProgram(null); setClearance(null);
    try {
      const v = parsed.data;
      const res = await api.ai.generateWorkout({
        client_id: clientId,
        ...(mode ? { mode } : {}),
        ...(acknowledgeUnscreened ? { acknowledge_unscreened: true } : {}),
        ...(form.duration_weeks ? { duration_weeks: Number(form.duration_weeks) } : {}),
        // A blank box is omitted, not sent as zero — omission is what tells
        // the server to keep whatever its own record holds.
        age: stated(v.age), gender: form.gender || undefined,
        weight_kg: stated(v.weight_kg), height_cm: stated(v.height_cm),
        goal: form.goal || undefined, experience_level: form.experience_level || undefined,
        injuries: v.injuries ?? undefined,
        training_days: stated(v.training_days),
      }, controller.signal);
      setPlan(res.data);
      setGenerationId(res.generation_id ?? null);
      setMeta({
        model: res.model, tier: res.tier, used_fallback: res.used_fallback,
        grounding: res.grounding, audit: res.audit,
        screen: res.screen, quality: res.quality,
        critique: res.critique, critique_verdict: res.critique_verdict,
      });
    } catch (e: unknown) {
      // Two refusals this page can answer, and nothing else.
      const active = activeProgramFrom(e);
      const unscreened = clearanceFrom(e);
      if (active) setActiveProgram(active);
      else if (unscreened) setClearance(unscreened);
      else if (!isAbort(e)) setError(generationErrorMessage(e, 'Failed to generate workout plan.'));
    } finally {
      generatingRef.current = false;
      abortRef.current = null;
      setLoading(false);
    }
  };

  /**
   * Save & assign — the generation id is the whole request. The server writes
   * the plan from the frozen proposal and assigns it, screening gate included.
   */
  const savePlan = async () => {
    if (!generationId || savingRef.current) return;
    // A critical finding is the audit's fact about this exact proposal; the
    // server refuses it too, but the button should not invite the attempt.
    if ((meta?.audit?.violations ?? []).some((v) => v.severity === 'critical')) return;
    savingRef.current = true;
    setSavingPlan(true); setSaveError('');
    try {
      setSaved(await api.workouts.plans.saveFromGeneration({ generation_id: generationId }));
    } catch (e: unknown) {
      setSaveError(errorMessage(e, 'Could not save the programme'));
    } finally {
      savingRef.current = false;
      setSavingPlan(false);
    }
  };

  const scheduleEntries = plan ? Object.entries(plan.weekly_schedule ?? {}) : [];

  const criticalCount = (meta?.audit?.violations ?? [])
    .filter((v) => v.severity === 'critical').length;

  return (
    <Guard>
      <PageContainer>

        <PageHero
          icon={<Dumbbell size={20} />}
          title="AI Workout Generator"
          subtitle="A prompt-based draft from the client's record, ready to review before it is saved."
          className="mx-auto w-full max-w-4xl"
        />

        <p className="mx-auto mb-4 w-full max-w-4xl text-[12.5px]">
          <Link
            href={`/pt-os/workout-generator${linkedClientId ? `?client_id=${linkedClientId}` : ''}`}
            className="font-[700]"
            style={{ color: ACCENT }}
          >
            For powerlifting blocks and training maxes, open the rule-based Workout Generator →
          </Link>
        </p>

      <div className="mx-auto w-full max-w-4xl">

        {/* ── Form ── */}
        <m.div variants={fadeUp} initial="hidden" animate="show" custom={1}
          className="mb-8 rounded-[22px] p-5 sm:p-7"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[11px]" style={{ background: ACCENT_DIM }}>
              <Target size={16} color={ACCENT} />
            </div>
            <div>
              <div className="text-[15px] font-[750]" style={{ color: 'var(--text-primary)' }}>Your Profile</div>
            </div>
          </div>

          {/* Shown on a bare entry (nav, landing, unattached Coach), and again
              when a ?client_id= no longer resolves: a stale link must not be a
              dead end with no way to choose somebody else. */}
          {(!linkedClientId || prefill.failed) && (
            <AiClientPicker selected={pickedClient} onSelect={setPickedClient} />
          )}

          {/* What the prefill found, in words. The form is filled from the
              client's own record; anything the record does not hold is left
              blank, never guessed at. */}
          {clientId && (
            <div role="status"
              className="mb-5 rounded-[12px] px-3.5 py-2 text-[12.5px] font-[600]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              {prefill.loading
                ? 'Loading this client’s saved details…'
                : prefill.failed
                  ? 'Could not load the saved details — fill in what you know.'
                  : prefill.facts && hasAnyFact(prefill.facts.workout)
                    ? `Prefilled from ${prefill.facts.clientName}’s record. Where the record already holds a value the server uses it — this form only fills the gaps.`
                    : 'Nothing saved for this client yet — fill in what you know.'}
            </div>
          )}

          {/* No asterisks. These three are OPTIONAL and the server says so: it
              prefers its own record every time, and a blank box means "the
              record already knows, or nobody does". Marking them required was
              not merely unenforced, it was wrong.

              `NumberField` rather than `type="number"`: the numeric keypad
              still appears on a phone, through inputMode, without the wheel
              over a focused field silently changing a client's weight. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumberField field={ageField} label="Age" density="compact" mode="integer" suffix="yrs" />
            <NumberField field={weightField} label="Weight" density="compact" mode="decimal" suffix="kg" />
            <NumberField field={heightField} label="Height" density="compact" mode="decimal" suffix="cm" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChoiceChips
              field={genderField} legend="Gender" density="compact"
              options={['male', 'female', 'other'].map((g) => ({ value: g, label: labelMap[g] ?? g }))}
            />
            <ChoiceChips
              field={experienceField} legend="Experience Level" density="compact"
              options={EXPERIENCE.map((x) => ({ value: x, label: labelMap[x] ?? x }))}
            />
            <SelectField
              field={goalField} label="Fitness Goal" density="compact"
              options={GOALS.map((g) => ({ value: g, label: labelMap[g] ?? g }))}
            />
            <ChoiceChips
              field={trainingDaysField} legend="Training Days / Week" density="compact"
              className="sm:col-span-2"
              options={['2', '3', '4', '5', '6'].map((d) => ({ value: d, label: d }))}
            />
            {/* How long a block to write. Blank lets the server's own default
                (8 weeks, or the active programme's length) apply. */}
            <SelectField
              field={durationField} label="Programme Length" density="compact"
              description="Applies to a new programme. Continuing an existing block keeps its own length."
              options={[
                { value: '', label: 'Studio default' },
                ...[4, 6, 8, 12, 16].map((w) => ({ value: String(w), label: `${w} weeks` })),
              ]}
            />
            {/* Never defaulted to "none" anywhere in this system: the server's
                own comment explains that the old `|| 'none'` printed a clean
                bill of health for every client nobody had written a note
                about. Blank here means blank there. */}
            <TextField
              field={injuriesField} label="Injuries / Limitations" density="compact"
              className="sm:col-span-2" maxLength={500}
            />
          </div>

          {/* The equipment key the prompt reads, written where the trainer can
              see why it matters. An empty box is the honest state — the AI was
              told nothing and guessed a commercial gym. */}
          <div className="mt-5 rounded-[14px] p-4"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
            <div className="mb-1 flex items-center gap-2">
              <Dumbbell size={14} color={ACCENT} />
              <span className="text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>Studio equipment</span>
            </div>
            <p className="mb-3 mt-0 text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              What your studio can train with. Every AI programme reads this, so
              the exercises match the kit in the room.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <TextField
                field={studioEquipmentField} label="Studio equipment" density="compact"
                className="flex-1" labelHidden
              />
              <button onClick={saveEquipment} disabled={savingEquipment}
                className="rounded-[12px] px-4 py-2.5 text-[12.5px] font-[700]"
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', opacity: savingEquipment ? 0.6 : 1,
                }}>
                {savingEquipment ? 'Saving…' : 'Save equipment'}
              </button>
            </div>
            {equipmentSaved && (
              <span role="status" className="mt-2 inline-block text-[12px] font-[650]" style={{ color: ACCENT }}>
                Saved — future programmes will use this.
              </span>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-[12px] px-4 py-2.5 text-[13px] font-[600]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {activeProgram && (
            <div role="alert"
              className="mt-4 rounded-[12px] px-4 py-3 text-[13px] font-[600]"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#92400e' }}>
              <div>{activeProgram.message}</div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                {([
                  ['adapt', 'Progress this programme'],
                  ['new', 'Start a new one'],
                ] as const).map(([mode, label]) => (
                  <button key={mode} onClick={() => handleGenerate(mode)} disabled={loading}
                    className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-[700]"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {clearance && (
            <div role="alert"
              className="mt-4 rounded-[12px] px-4 py-3 text-[13px] font-[600]"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', color: '#92400e' }}>
              <div>{clearance.message}</div>
              <div className="mt-3">
                <button onClick={() => handleGenerate(lastModeRef.current, true)} disabled={loading}
                  className="rounded-[10px] px-3.5 py-2 text-[12.5px] font-[700]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  Generate without a screen
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => handleGenerate()} disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] px-7 py-3 text-[14px] font-[750] text-white transition-all sm:w-auto"
              style={{
                background: ACCENT_GRADIENT,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(163,55,87,0.35)',
              }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Generating Plan…' : 'Generate Workout Plan'}
            </button>
            {plan && (
              <button onClick={() => {
                setPlan(null); setMeta(null); setGenerationId(null);
                setSaved(null); setSaveError(''); setActiveProgram(null); setClearance(null);
              }}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] px-5 py-3 text-[13.5px] font-[650] sm:w-auto"
                style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <RotateCcw size={14} /> Start Over
              </button>
            )}
          </div>
        </m.div>

        {/* ── Loading ── */}
        {loading && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-5 py-14">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px]"
              style={{ background: ACCENT_DIM, border: '1px solid rgba(163,55,87,0.2)' }}>
              <span className="absolute inset-0 animate-ping rounded-[24px] opacity-20" style={{ background: ACCENT }} />
              <Dumbbell size={30} color={ACCENT} />
            </div>
            <div className="text-center">
              <div className="text-[16px] font-[750]" style={{ color: 'var(--text-primary)' }}>{LOADING_STEPS[loadStep]}</div>
              <div className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Usually takes 15–30 seconds</div>
            </div>
            <div className="flex gap-1.5">
              {LOADING_STEPS.map((_, i) => (
                <span key={i} className="h-1.5 w-6 rounded-full transition-colors"
                  style={{ background: i <= loadStep ? ACCENT : 'var(--border)' }} />
              ))}
            </div>
            {/* shortcut: stops the wait, not the billed call — the server has
                already started generating. Upgrade if the provider gains a
                cancel endpoint. */}
            <button onClick={() => abortRef.current?.abort()}
              className="rounded-[12px] px-4 py-2 text-[13px] font-[700]"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </m.div>
        )}

        {/* ── Results ── */}
        {plan && (
          <div className="flex flex-col gap-5">
            {meta && (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={0}
                className="rounded-[22px] p-5 sm:p-6"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {!generationId ? (
                  // Generation is never blocked on its own bookkeeping, so a
                  // failed ledger write still returns a plan. Without an id
                  // there is nothing to save; saying nothing left the trainer
                  // with a plan and no way to keep it.
                  <div role="status" className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    <div className="text-[14px] font-[750]">This plan could not be recorded</div>
                    <p className="mb-0 mt-1" style={{ color: 'var(--text-muted)' }}>
                      The proposal was not written to the ledger, so there is nothing to save. Generate again to get a plan you can keep.
                    </p>
                  </div>
                ) : saved ? (
                  <div role="status" className="text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    <div className="text-[14px] font-[750]">
                      {saved.assigned === false
                        ? 'Saved, but not assigned — it will not appear on Today.'
                        : (saved.other_active_assignments ?? 0) > 0
                          ? `Saved and assigned — this client is now on ${(saved.other_active_assignments ?? 0) + 1} active programmes. A started session uses the one that prescribes today's workout; choose the programme explicitly if that is not the right one.`
                          : `Saved ${saved.saved} exercises to ${saved.name} — now live for this client.`}
                    </div>
                    {saved.unresolved.length > 0 && (
                      <p className="mb-0 mt-2" style={{ color: 'var(--text-muted)' }}>
                        {saved.unresolved.length} not in the library — create them in the Exercise Library, then add them in the builder:{' '}
                        {saved.unresolved.map((u) => u.name).join(', ')}
                      </p>
                    )}
                    {!!saved.screening_warnings?.length && (
                      <p className="mb-0 mt-2" style={{ color: '#92400e' }}>
                        {saved.screening_warnings.join(' ')}
                      </p>
                    )}
                    <Link href={`/pt-os/workout-plans/${saved.plan_id}/builder`}
                      className="mt-3 inline-block text-[12.5px] font-[700]" style={{ color: ACCENT }}>
                      Open in builder →
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>Happy with this plan?</div>
                      <p className="mb-0 mt-1 text-[12.5px] leading-relaxed" style={{ color: criticalCount ? '#DC2626' : 'var(--text-muted)' }}>
                        {criticalCount
                          ? `Cannot save — ${criticalCount} critical safety finding${criticalCount === 1 ? '' : 's'}. Regenerate the programme.`
                          : 'Save & assign writes it to this client and makes it their live programme.'}
                      </p>
                    </div>
                    <button onClick={savePlan} disabled={savingPlan || criticalCount > 0}
                      className="flex items-center justify-center gap-2 rounded-[12px] px-5 py-2.5 text-[13px] font-[750] text-white"
                      style={{ background: ACCENT_GRADIENT, opacity: savingPlan ? 0.6 : 1 }}>
                      {savingPlan ? <Loader2 size={14} className="animate-spin" /> : null}
                      {savingPlan ? 'Saving…' : 'Save & assign'}
                    </button>
                  </div>
                )}
                {saveError && (
                  <div role="alert" className="mt-3 rounded-[12px] px-4 py-2.5 text-[13px] font-[600]"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
                    {saveError}
                  </div>
                )}
              </m.div>
            )}
            {meta && (
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={0}
                className="flex w-fit items-center gap-2 rounded-full px-3.5 py-2"
                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <Sparkles size={13} color="#B45309" />
                <span className="text-[12px] font-[650]" style={{ color: '#B45309' }}>Generated by {meta.model}</span>
                {meta.used_fallback && <span className="text-[11px]" style={{ color: '#B45309', opacity: 0.7 }}>(fallback)</span>}
              </m.div>
            )}

            {/* Overview */}
            <m.div variants={fadeUp} initial="hidden" animate="show" custom={1}
              className="overflow-hidden rounded-[22px]"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #F1F5F9, #F8FAFC)', borderBottom: '1px solid var(--border)' }}>
                <h2 className="m-0 text-[20px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{plan.name}</h2>
                <p className="mb-0 mt-1.5 text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
              </div>
              <div className="grid grid-cols-3">
                {[
                  { icon: <Clock size={16} color={ACCENT} />, label: 'Duration', value: `${plan.weeks} weeks` },
                  { icon: <Flame size={16} color={ACCENT} />, label: 'Level', value: plan.level },
                  { icon: <Dumbbell size={16} color={ACCENT} />, label: 'Days / Week', value: String(plan.days_per_week) },
                ].map((s, i) => (
                  <div key={i} className="px-3 py-4 text-center" style={{ borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
                    <div className="mb-1.5 flex justify-center">{s.icon}</div>
                    <div className="text-[16px] font-[800] capitalize sm:text-[18px]" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
                    <div className="mt-0.5 text-[10.5px] font-[600] uppercase tracking-wide" style={{ color: 'var(--text-disabled)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {/* What the engine checked before proposing this plan. The
                  client card has always shown it; this page threw the screen,
                  the rule audit, the quality score and the second opinion away
                  and asked the trainer to approve with less than the server
                  knew. */}
              {meta && (
                <div className="px-6 pb-5">
                  <GenerationEvidence result={meta} />
                </div>
              )}
            </m.div>

            {plan.warm_up && <NoteCard title="Warm-Up Protocol" text={plan.warm_up} index={2} />}

            <div>
              <div className="mb-3 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: 'var(--text-disabled)' }}>
                Weekly Schedule
              </div>
              <div className="flex flex-col gap-2.5">
                {scheduleEntries.map(([key, day], i) => (
                  <DayCard key={key} dayKey={key} day={day} index={i} />
                ))}
              </div>
            </div>

            {plan.cool_down && <NoteCard title="Cool-Down Protocol" text={plan.cool_down} index={3} />}

            {(plan.progression_notes || plan.nutrition_notes) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {plan.progression_notes && <NoteCard title="Progression Notes" text={plan.progression_notes} index={4} />}
                {plan.nutrition_notes && <NoteCard title="Nutrition Notes" text={plan.nutrition_notes} index={5} />}
              </div>
            )}
          </div>
        )}
      </div>
      </PageContainer>
    </Guard>
  );
}
