'use client';

import { useEffect, useState } from 'react';
import { Dumbbell, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw, Flame, Clock, Target } from 'lucide-react';
import { m, type Variants } from 'framer-motion';
import { api } from '@/lib/api';
import type { AiWorkoutPlan, AiWorkoutDay, AiWorkoutExercise } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const ACCENT = '#3B82F6';
const ACCENT_SOFT = '#60A5FA';
const ACCENT_DIM = 'rgba(59,130,246,0.10)';
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

/* ─── Form atoms ─────────────────────────────────────────────────────────── */
function Field({ label, required, children, span }: { label: string; required?: boolean; children: React.ReactNode; span?: boolean }) {
  return (
    <div style={span ? { gridColumn: '1 / -1' } : undefined}>
      <label className="mb-1.5 block text-[11px] font-[700] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
        {label}{required && <span style={{ color: ACCENT }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-[12px] px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-blue-400';
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)',
};

function PillGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt} type="button" onClick={() => onChange(opt)}
            className="rounded-full px-3.5 py-2 text-[12.5px] font-[650] transition-all"
            style={active
              ? { background: ACCENT_GRADIENT, color: '#fff', border: '1px solid transparent', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }
              : { background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            {labelMap[opt] ?? opt}
          </button>
        );
      })}
    </div>
  );
}

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

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!loading) { setLoadStep(0); return; }
    const t = setInterval(() => setLoadStep((s) => (s + 1) % LOADING_STEPS.length), 2600);
    return () => clearInterval(t);
  }, [loading]);

  const handleGenerate = async () => {
    if (!form.age || !form.weight_kg || !form.height_cm) { setError('Age, weight and height are required.'); return; }
    setError(''); setLoading(true); setPlan(null); setMeta(null);
    try {
      const res = await api.ai.generateWorkout({
        age: parseInt(form.age), gender: form.gender,
        weight_kg: parseFloat(form.weight_kg), height_cm: parseFloat(form.height_cm),
        goal: form.goal, experience_level: form.experience_level,
        injuries: form.injuries || undefined, equipment: form.equipment,
        training_days: parseInt(form.training_days),
      });
      setPlan(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate workout plan.');
    } finally { setLoading(false); }
  };

  const scheduleEntries = plan ? Object.entries(plan.weekly_schedule ?? {}) : [];

  return (
    <Guard>
      <AppShell>
        <div className="mx-auto w-full max-w-4xl pb-20 pt-6">

          {/* ── Hero ── */}
          <m.div variants={fadeUp} initial="hidden" animate="show" custom={0}
            className="relative mb-6 overflow-hidden rounded-[28px] p-7 sm:p-9"
            style={{ background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
            <div className="pointer-events-none absolute -right-14 -top-14 h-44 w-44 rounded-full opacity-60 blur-3xl"
              style={{ background: 'rgba(96,165,250,0.35)' }} />
            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[16px]"
                style={{ background: ACCENT_GRADIENT, boxShadow: '0 8px 24px rgba(59,130,246,0.35)' }}>
                <Dumbbell size={24} color="#fff" />
              </div>
              <div>
                <h1 className="text-[26px] font-[860] leading-tight tracking-[-0.03em] sm:text-[32px]" style={{ color: 'var(--text-primary)' }}>
                  AI Workout Generator
                </h1>
                <p className="mt-1 max-w-xl text-[13.5px] sm:text-[14px]" style={{ color: 'var(--text-muted)' }}>
                  A personalised training programme built around your biology, goals, and equipment.
                </p>
              </div>
            </div>
            <div className="relative mt-5 flex flex-wrap gap-2">
              {['Progressive Overload', 'Warm-Up & Cool-Down', 'Injury-Aware', 'Tempo & Rest Times'].map((p) => (
                <span key={p} className="rounded-full px-3 py-1.5 text-[11.5px] font-[650]"
                  style={{ background: 'rgba(255,255,255,0.75)', color: ACCENT, border: '1px solid rgba(59,130,246,0.2)' }}>
                  {p}
                </span>
              ))}
            </div>
          </m.div>

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

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Age" required>
                <input type="number" inputMode="numeric" className={inputCls} style={inputStyle} placeholder="28"
                  value={form.age} onChange={(e) => set('age', e.target.value)} />
              </Field>
              <Field label="Weight (kg)" required>
                <input type="number" inputMode="decimal" className={inputCls} style={inputStyle} placeholder="75"
                  value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
              </Field>
              <Field label="Height (cm)" required>
                <input type="number" inputMode="decimal" className={inputCls} style={inputStyle} placeholder="175"
                  value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} />
              </Field>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Gender">
                <PillGroup options={['male', 'female', 'other']} value={form.gender} onChange={(v) => set('gender', v)} />
              </Field>
              <Field label="Experience Level">
                <PillGroup options={EXPERIENCE} value={form.experience_level} onChange={(v) => set('experience_level', v)} />
              </Field>
              <Field label="Fitness Goal">
                <select className={inputCls} style={inputStyle} value={form.goal} onChange={(e) => set('goal', e.target.value)}>
                  {GOALS.map((g) => <option key={g} value={g}>{labelMap[g]}</option>)}
                </select>
              </Field>
              <Field label="Available Equipment">
                <select className={inputCls} style={inputStyle} value={form.equipment} onChange={(e) => set('equipment', e.target.value)}>
                  {EQUIPMENT.map((eq) => <option key={eq} value={eq}>{labelMap[eq]}</option>)}
                </select>
              </Field>
              <Field label="Training Days / Week" span>
                <PillGroup options={['2', '3', '4', '5', '6']} value={form.training_days} onChange={(v) => set('training_days', v)} />
              </Field>
              <Field label="Injuries / Limitations" span>
                <input type="text" className={inputCls} style={inputStyle}
                  placeholder="e.g. lower back pain, bad knees (optional)"
                  value={form.injuries} onChange={(e) => set('injuries', e.target.value)} />
              </Field>
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
                  boxShadow: loading ? 'none' : '0 8px 24px rgba(59,130,246,0.35)',
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
                style={{ background: ACCENT_DIM, border: '1px solid rgba(59,130,246,0.2)' }}>
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
                  style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <Sparkles size={13} color="#B8860B" />
                  <span className="text-[12px] font-[650]" style={{ color: '#B8860B' }}>Generated by {meta.model}</span>
                  {meta.used_fallback && <span className="text-[11px]" style={{ color: '#B8860B', opacity: 0.7 }}>(fallback)</span>}
                </m.div>
              )}

              {/* Overview */}
              <m.div variants={fadeUp} initial="hidden" animate="show" custom={1}
                className="overflow-hidden rounded-[22px]"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0F9FF)', borderBottom: '1px solid var(--border)' }}>
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
      </AppShell>
    </Guard>
  );
}
