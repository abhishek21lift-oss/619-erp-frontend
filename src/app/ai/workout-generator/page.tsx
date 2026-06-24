'use client';

import { useState } from 'react';
import { Dumbbell, Loader2, ChevronDown, ChevronUp, Sparkles, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import type { AiWorkoutPlan, AiWorkoutDay, AiWorkoutExercise } from '@/lib/api';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

const GOALS = ['weight_loss', 'muscle_gain', 'strength', 'endurance', 'flexibility', 'general_fitness'];
const EXPERIENCE = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT = ['gym', 'home', 'minimal', 'bodyweight_only'];

const labelMap: Record<string, string> = {
  weight_loss: 'Weight Loss', muscle_gain: 'Muscle Gain', strength: 'Strength',
  endurance: 'Endurance', flexibility: 'Flexibility', general_fitness: 'General Fitness',
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
  gym: 'Full Gym', home: 'Home (with equipment)', minimal: 'Minimal Equipment', bodyweight_only: 'Bodyweight Only',
};

function ExerciseRow({ ex, index }: { ex: AiWorkoutExercise; index: number }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">{ex.name}</div>
        <div className="text-sm text-muted-foreground mt-0.5">
          {ex.sets} sets × {ex.reps} reps
          {ex.tempo ? ` · Tempo: ${ex.tempo}` : ''}
          {ex.rest_seconds ? ` · Rest: ${ex.rest_seconds}s` : ''}
        </div>
        {ex.notes && <div className="text-xs text-muted-foreground mt-1 italic">{ex.notes}</div>}
      </div>
    </div>
  );
}

function DayCard({ dayKey, day }: { dayKey: string; day: AiWorkoutDay }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      >
        <div>
          <span className="font-semibold text-foreground capitalize">{dayKey}</span>
          <span className="ml-2 text-sm text-muted-foreground">— {day.focus}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{day.exercises?.length ?? 0} exercises</span>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="p-4 space-y-2">
          {day.exercises?.map((ex, i) => <ExerciseRow key={i} ex={ex} index={i} />)}
        </div>
      )}
    </div>
  );
}

export default function WorkoutGeneratorPage() {
  const [form, setForm] = useState({
    age: '', gender: 'male', weight_kg: '', height_cm: '',
    goal: 'general_fitness', experience_level: 'beginner',
    injuries: '', equipment: 'gym', training_days: '4',
  });
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AiWorkoutPlan | null>(null);
  const [meta, setMeta] = useState<{ model?: string; tier?: string; used_fallback?: boolean } | null>(null);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    if (!form.age || !form.weight_kg || !form.height_cm) {
      setError('Age, weight and height are required.');
      return;
    }
    setError('');
    setLoading(true);
    setPlan(null);
    setMeta(null);
    try {
      const res = await api.ai.generateWorkout({
        age: parseInt(form.age),
        gender: form.gender,
        weight_kg: parseFloat(form.weight_kg),
        height_cm: parseFloat(form.height_cm),
        goal: form.goal,
        experience_level: form.experience_level,
        injuries: form.injuries || undefined,
        equipment: form.equipment,
        training_days: parseInt(form.training_days),
      });
      setPlan(res.data);
      setMeta({ model: res.model, tier: res.tier, used_fallback: res.used_fallback });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate workout plan.');
    } finally {
      setLoading(false);
    }
  };

  const scheduleEntries = plan ? Object.entries(plan.weekly_schedule ?? {}) : [];

  return (
    <Guard>
      <AppShell title="AI Workout Generator">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Dumbbell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Workout Generator</h1>
          <p className="text-muted-foreground text-sm">Generate a personalised training plan in seconds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-2xl border border-border bg-card">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Age *</label>
          <input type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 28" value={form.age} onChange={(e) => set('age', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Gender</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.gender} onChange={(e) => set('gender', e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Weight (kg) *</label>
          <input type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 75" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Height (cm) *</label>
          <input type="number" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 175" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Goal</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.goal} onChange={(e) => set('goal', e.target.value)}>
            {GOALS.map((g) => <option key={g} value={g}>{labelMap[g]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Experience Level</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.experience_level} onChange={(e) => set('experience_level', e.target.value)}>
            {EXPERIENCE.map((e) => <option key={e} value={e}>{labelMap[e]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Available Equipment</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.equipment} onChange={(e) => set('equipment', e.target.value)}>
            {EQUIPMENT.map((eq) => <option key={eq} value={eq}>{labelMap[eq]}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Training Days / Week</label>
          <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" value={form.training_days} onChange={(e) => set('training_days', e.target.value)}>
            {[2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-foreground">Injuries / Limitations</label>
          <input type="text" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. lower back pain, bad knees (optional)" value={form.injuries} onChange={(e) => set('injuries', e.target.value)} />
        </div>
        {error && <div className="md:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</div>}
        <div className="md:col-span-2 flex gap-3">
          <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : 'Generate Plan'}
          </button>
          {plan && (
            <button onClick={() => { setPlan(null); setMeta(null); }} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {plan && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {meta && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Generated by <code className="bg-muted px-1 rounded">{meta.model}</code></span>
              {meta.used_fallback && <span className="text-yellow-600">(fallback model)</span>}
            </div>
          )}

          <div className="p-5 rounded-2xl border border-border bg-card space-y-1">
            <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
            <p className="text-muted-foreground text-sm">{plan.description}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <span className="text-muted-foreground">Duration: <strong className="text-foreground">{plan.weeks} weeks</strong></span>
              <span className="text-muted-foreground">Level: <strong className="text-foreground capitalize">{plan.level}</strong></span>
              <span className="text-muted-foreground">Days/week: <strong className="text-foreground">{plan.days_per_week}</strong></span>
            </div>
          </div>

          {plan.warm_up && (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground mb-1">Warm-Up</div>
              <p className="text-sm text-muted-foreground">{plan.warm_up}</p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Weekly Schedule</h3>
            {scheduleEntries.map(([key, day]) => (
              <DayCard key={key} dayKey={key} day={day} />
            ))}
          </div>

          {plan.cool_down && (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground mb-1">Cool-Down</div>
              <p className="text-sm text-muted-foreground">{plan.cool_down}</p>
            </div>
          )}

          {plan.progression_notes && (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground mb-1">Progression Notes</div>
              <p className="text-sm text-muted-foreground">{plan.progression_notes}</p>
            </div>
          )}

          {plan.nutrition_notes && (
            <div className="p-4 rounded-xl border border-border bg-muted/20">
              <div className="text-sm font-medium text-foreground mb-1">Nutrition Notes</div>
              <p className="text-sm text-muted-foreground">{plan.nutrition_notes}</p>
            </div>
          )}
        </div>
      )}
        </div>
      </AppShell>
    </Guard>
  );
}
