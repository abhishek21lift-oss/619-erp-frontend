'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Dumbbell, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw, Flame, Clock, Target } from 'lucide-react';
import { m, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type { AiWorkoutPlan, AiWorkoutDay, AiWorkoutExercise } from '@/lib/api';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import { errorMessage } from '@/lib/forms/errors';
import {
  NumberField, SelectField, TextField, ChoiceChips, useStandaloneField,
} from '@/components/ui/form';
import { aiWorkoutInputSchema, stated } from '@/lib/forms/schemas/aiGenerator';

const ACCENT = '#0067E0';
const ACCENT_SOFT = '#0067E0';
const ACCENT_DIM = 'rgba(0,103,224,0.10)';
const ACCENT_GRADIENT = `linear-gradient(135deg, ${ACCENT_SOFT}, ${ACCENT})`;

const GOALS = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness'];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT = ['gym', 'home', 'minimal', 'bodyweight_only'];

const labelMap: Record<string, string> = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness',
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
  gym: 'Full Gym', home: 'Home (with equipment)', minimal: 'Minimal Equipment', bodyweight_only: 'Bodyweight Only',
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

function NoteCard({ title, text, index }: { title: string; text: string; index: number }) {
  return (
    <m.div variants={fadeUp} initial="hidden" animate="show" custom={index}
      className="rounded-[18px] px-5 py-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="mb-2 text-[11px] font-[700] uppercase tracking-[0.08em]" style={{ color: ACCENT }}>{title}</div>
      <p className="m-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{text}</p>
    </m.div>
  );
}

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
  // So: the id comes from the query string, and without it the form says to
  // pick a client instead of posting a request that cannot succeed.
  const clientId = useSearchParams().get('client_id');
  const [form, setForm] = useState({
    age: '', gender: 'male', weight_kg: '', height_cm: '',
    goal: 'general_fitness', experience_level: 'beginner',
    injuries: '', equipment: 'gym', training_days: '4',
  });
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [plan, setPlan] = useState<AiWorkoutPlan | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');
  /** Per-field messages from the schema. Populated only by a generate ATTEMPT. */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /**
   * A same-frame re-entry guard.
   *
   * `loading` is state, so two taps in one frame both read false and both fire
   * the request — and a generation is a billed model call, not a no-op.
   */
  const generatingRef = useRef(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const ageField = useStandaloneField('age', form.age, (v: string) => set('age', v), { error: fieldErrors.age });
  const weightField = useStandaloneField('weight_kg', form.weight_kg, (v: string) => set('weight_kg', v), { error: fieldErrors.weight_kg });
  const heightField = useStandaloneField('height_cm', form.height_cm, (v: string) => set('height_cm', v), { error: fieldErrors.height_cm });
  const goalField = useStandaloneField('goal', form.goal, (v: string) => set('goal', v), { error: fieldErrors.goal });
  const equipmentField = useStandaloneField('equipment', form.equipment, (v: string) => set('equipment', v), { error: fieldErrors.equipment });
  const injuriesField = useStandaloneField('injuries', form.injuries, (v: string) => set('injuries', v), { error: fieldErrors.injuries });
  const genderField = useStandaloneField('gender', form.gender, (v: string) => set('gender', v), { error: fieldErrors.gender });
  const experienceField = useStandaloneField('experience_level', form.experience_level, (v: string) => set('experience_level', v), { error: fieldErrors.experience_level });
  const trainingDaysField = useStandaloneField('training_days', form.training_days, (v: string) => set('training_days', v), { error: fieldErrors.training_days });

  useEffect(() => {
    if (!loading) { setLoadStep(0); return; }
    const t = setInterval(() => setLoadStep((s) => (s + 1) % LOADING_STEPS.length), 2600);
    return () => clearInterval(t);
  }, [loading]);

  const handleGenerate = async () => {
    if (generatingRef.current) return;
    if (!clientId) {
      setError('Open this generator from a client profile — a programme is written for a specific client.');
      return;
    }

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
    setError(''); setLoading(true); setPlan(null); setMeta(null);
    try {
      const v = parsed.data;
      const res = await api.ai.generateWorkout({
        client_id: clientId,
        // A blank box is omitted, not sent as zero — omission is what tells
        // the server to keep whatever its own record holds.
        age: stated(v.age), gender: form.gender || undefined,
        weight_kg: stated(v.weight_kg), height_cm: stated(v.height_cm),
        goal: form.goal || undefined, experience_level: form.experience_level || undefined,
        injuries: v.injuries ?? undefined, equipment: form.equipment || undefined,
        training_days: stated(v.training_days),
      });
      setPlan(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to generate workout plan.'));
    } finally {
      generatingRef.current = false;
      setLoading(false);
    }
  };

  const scheduleEntries = plan ? Object.entries(plan.weekly_schedule ?? {}) : [];

  return (
    <Guard>
      <PageContainer>

        <PageHero
          icon={<Dumbbell size={20} />}
          title="AI Workout Generator"
          subtitle="A personalised training programme built around your biology, goals, and equipment."
        >
          <div className="flex flex-wrap gap-2">
            {['Progressive Overload', 'Warm-Up & Cool-Down', 'Injury-Aware', 'Tempo & Rest Times'].map((p) => (
              <span key={p} className="rounded-full px-3 py-1.5 text-[11.5px] font-[650] text-white"
                style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)' }}>
                {p}
              </span>
            ))}
          </div>
        </PageHero>

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
              <div className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>The plan is calibrated to everything below</div>
            </div>
          </div>

          {/* No asterisks. These three are OPTIONAL and the server says so: it
              prefers its own record every time, and a blank box means "the
              record already knows, or nobody does". Marking them required was
              not merely unenforced, it was wrong.

              `NumberField` rather than `type="number"`: the numeric keypad
              still appears on a phone, through inputMode, without the wheel
              over a focused field silently changing a client's weight. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <NumberField field={ageField} label="Age" density="compact" mode="integer" placeholder="28" suffix="yrs" />
            <NumberField field={weightField} label="Weight" density="compact" mode="decimal" placeholder="75" suffix="kg" />
            <NumberField field={heightField} label="Height" density="compact" mode="decimal" placeholder="175" suffix="cm" />
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
            <SelectField
              field={equipmentField} label="Available Equipment" density="compact"
              options={EQUIPMENT.map((eq) => ({ value: eq, label: labelMap[eq] ?? eq }))}
            />
            <ChoiceChips
              field={trainingDaysField} legend="Training Days / Week" density="compact"
              className="sm:col-span-2"
              options={['2', '3', '4', '5', '6'].map((d) => ({ value: d, label: d }))}
            />
            {/* Never defaulted to "none" anywhere in this system: the server's
                own comment explains that the old `|| 'none'` printed a clean
                bill of health for every client nobody had written a note
                about. Blank here means blank there. */}
            <TextField
              field={injuriesField} label="Injuries / Limitations" density="compact"
              className="sm:col-span-2" maxLength={500}
              placeholder="e.g. lower back pain, bad knees (optional)"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-[12px] px-4 py-2.5 text-[13px] font-[600]"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={handleGenerate} disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] px-7 py-3 text-[14px] font-[750] text-white transition-all sm:w-auto"
              style={{
                background: ACCENT_GRADIENT,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 8px 24px rgba(0,103,224,0.35)',
              }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading ? 'Generating Plan…' : 'Generate Workout Plan'}
            </button>
            {plan && (
              <button onClick={() => { setPlan(null); setMeta(null); }}
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
              style={{ background: ACCENT_DIM, border: '1px solid rgba(0,103,224,0.2)' }}>
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
          </m.div>
        )}

        {/* ── Results ── */}
        {plan && (
          <div className="flex flex-col gap-5">
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
