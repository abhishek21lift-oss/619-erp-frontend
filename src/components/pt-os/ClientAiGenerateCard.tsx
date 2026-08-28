'use client';

/**
 * One-tap AI workout / diet generation for the client already on screen.
 *
 * Sits directly above the Client Login card on the client profile. The
 * generators behind these buttons take manual profile fields — the backend
 * does not read the client's own record — so this card fills them from what
 * the profile carries and states its defaults in the preview, so a trainer
 * sees what the AI was asked with.
 *
 * The result is a preview for review only. Nothing here is written to the
 * client's record: saving a plan is the workout/diet library's job, and the
 * generate endpoints themselves only stream a plan back.
 */

import { useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Dumbbell, Loader2, RotateCcw, Salad, Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { AiDietPlan, AiWorkoutPlan } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { palette, rgba } from '@/lib/palette';

const BLUE = palette.blue[500];
const GREEN = palette.emerald[500];
const EASE = [0.16, 1, 0.3, 1] as const;

export interface ClientAiGenerateCardProps {
  client: {
    id: string;
    name: string;
    gender?: string | null;
    dob?: string | null;
    weight?: number | null;
  };
  /** The client's current goal (e.g. 'fat_loss'), when there is one. */
  goalType?: string | null;
}

/** Age from the profile's DOB; the generators need a number, not a date. */
function computeAge(dob?: string | null): number {
  if (!dob) return 30;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 30;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return age > 0 && age < 120 ? age : 30;
}

/** The goal string the generators expect. 'custom' carries no meaning for them. */
function goalFor(goalType?: string | null): string {
  return goalType && goalType !== 'custom' ? goalType : 'general_fitness';
}

export default function ClientAiGenerateCard({ client, goalType }: ClientAiGenerateCardProps) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<'workout' | 'diet' | null>(null);
  const [result, setResult] = useState<{ kind: 'workout' | 'diet'; plan: AiWorkoutPlan | AiDietPlan } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // State updates are async; a ref is the guard that actually stops a double
  // tap from billing the studio for two generations.
  const busyRef = useRef(false);

  const generate = async (kind: 'workout' | 'diet') => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setResult(null);
    setError(null);

    // The profile carries no height (or injury / dietary record) for the
    // generators to read, so the request fills those with the same defaults
    // the AI coach uses elsewhere. The preview says what was assumed.
    const base = {
      age: computeAge(client.dob),
      gender: client.gender || 'male',
      weight_kg: client.weight ?? 75,
      height_cm: 175,
      goal: goalFor(goalType),
      client_id: client.id,
    };

    try {
      const res = kind === 'workout'
        ? await api.ai.generateWorkout({ ...base, experience_level: 'beginner', training_days: 4 })
        : await api.ai.generateDiet({ ...base, activity_level: 'moderate' });
      setResult({ kind, plan: res.data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const label = result?.kind === 'workout' ? 'AI workout' : 'AI diet';

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="relative overflow-hidden rounded-[18px]"
      style={{
        // An elevated surface rather than the translucent card, with the two
        // actions' own hues washed in from the top corners — the card is the
        // one place on this profile where something is generated rather than
        // read, and it should look like it.
        background: `linear-gradient(150deg, ${rgba(BLUE, 0.09)} 0%, var(--bg-elevated) 46%, ${rgba(GREEN, 0.07)} 100%)`,
        border: '1px solid var(--border)',
        boxShadow: `0 8px 26px ${rgba(BLUE, 0.10)}, inset 0 1px 0 rgba(255,255,255,0.55)`,
      }}
    >
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] text-white"
            style={{
              background: `linear-gradient(135deg, ${BLUE}, ${GREEN})`,
              boxShadow: `0 5px 14px ${rgba(BLUE, 0.38)}`,
            }}>
            <Sparkles size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-[800] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>Generate with AI</p>
            <p className="text-[11px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              Uses this client&rsquo;s profile &mdash; review before saving
            </p>
          </div>
        </div>
        {/* The same blue→green the two buttons carry, as one gesture. */}
        <div className="mt-3 h-[2px] w-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${BLUE}, ${GREEN}, transparent)` }} />
      </div>

      <div className="px-4 pb-4 pt-3">
        {/* Still one above the other, and still full width.
            Two half-width buttons was the first cut of this and it does not
            survive its own busy state: "Generating AI Workout..." needs most
            of the card's width at 12.5px, so the label would wrap or clip on
            exactly the screen where the trainer is watching for it.

            h-[44px], not h-10. globals.css sets `html { font-size: 14px }`,
            so Tailwind's rem sizes render at 87.5% of their names — h-10 is
            35px here, a third under the touch target this app holds
            everything else to. Anything that has to be exactly 44 says 44. */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void generate('workout')}
            disabled={busy !== null}
            className="flex h-[44px] w-full items-center justify-center gap-1.5 rounded-[13px] px-3 text-[12.5px] font-[720] text-white transition-transform active:scale-[0.985] disabled:opacity-45"
            style={{
              background: `linear-gradient(135deg, ${BLUE}, ${palette.blue[600]})`,
              boxShadow: `0 5px 14px ${rgba(BLUE, 0.32)}`,
            }}
          >
            {busy === 'workout'
              ? <><Loader2 size={14} className="animate-spin" /> Generating AI Workout...</>
              : <><Dumbbell size={14} /> Generate AI Workout</>}
          </button>

          <button
            type="button"
            onClick={() => void generate('diet')}
            disabled={busy !== null}
            className="flex h-[44px] w-full items-center justify-center gap-1.5 rounded-[13px] px-3 text-[12.5px] font-[720] text-white transition-transform active:scale-[0.985] disabled:opacity-45"
            style={{
              background: `linear-gradient(135deg, ${GREEN}, ${palette.emerald[600]})`,
              boxShadow: `0 5px 14px ${rgba(GREEN, 0.32)}`,
            }}
          >
            {busy === 'diet'
              ? <><Loader2 size={14} className="animate-spin" /> Generating AI Diet...</>
              : <><Salad size={14} /> Generate AI Diet</>}
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <m.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="alert"
              className="mt-3 flex items-start gap-1.5 overflow-hidden rounded-[10px] px-2.5 py-2 text-[11.5px] leading-relaxed"
              style={{ background: rgba(palette.red[500], 0.08), color: palette.red[500] }}
            >
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              {error}
            </m.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-[12px] px-3 py-2.5"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-[750] uppercase tracking-[0.07em]"
                  style={{ color: result.kind === 'workout' ? BLUE : GREEN }}>
                  {label} &mdash; review before saving
                </span>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="flex items-center gap-1 text-[11px] font-[650] transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <RotateCcw size={10} /> New
                </button>
              </div>

              {result.kind === 'workout' ? (
                <WorkoutPreview plan={result.plan as AiWorkoutPlan} />
              ) : (
                <DietPreview plan={result.plan as AiDietPlan} />
              )}

              <p className="mt-2 border-t pt-1.5 text-[10.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Preview only &mdash; nothing has been saved to {client.name}&rsquo;s record.
              </p>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
}

function WorkoutPreview({ plan }: { plan: AiWorkoutPlan }) {
  const days = Object.entries(plan.weekly_schedule ?? {});
  return (
    <div className="space-y-1">
      <p className="text-[12.5px] font-[740]" style={{ color: 'var(--text-primary)' }}>{plan.name}</p>
      <p className="text-[11px] font-[620]" style={{ color: 'var(--text-muted)' }}>
        Goal {plan.goal} &middot; {plan.level} &middot; {plan.weeks} weeks &middot; {plan.days_per_week}&times;/week
      </p>
      <ul className="space-y-0.5 pt-1">
        {days.slice(0, 4).map(([day, d]) => (
          <li key={day} className="text-[11px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            <span className="font-[720]" style={{ color: BLUE }}>{day}</span>: {d.name}
            {d.exercises?.length ? ` — ${d.exercises.slice(0, 3).map((e) => e.name).join(', ')}` : ''}
          </li>
        ))}
      </ul>
      {plan.progression_notes && (
        <p className="pt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {plan.progression_notes}
        </p>
      )}
    </div>
  );
}

function DietPreview({ plan }: { plan: AiDietPlan }) {
  const m = plan.macros;
  return (
    <div className="space-y-1">
      <p className="text-[12.5px] font-[740]" style={{ color: 'var(--text-primary)' }}>{plan.name}</p>
      <p className="text-[11px] font-[620]" style={{ color: 'var(--text-muted)' }}>
        {plan.total_calories} kcal &middot; P {m?.protein_g ?? '—'}g / C {m?.carbs_g ?? '—'}g / F {m?.fat_g ?? '—'}g
        {' '}&middot; {plan.hydration_ml ? `${plan.hydration_ml} ml water` : ''}
      </p>
      <ul className="space-y-0.5 pt-1">
        {(plan.meals ?? []).slice(0, 4).map((meal, i) => (
          <li key={`${meal.name}-${i}`} className="text-[11px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            <span className="font-[720]" style={{ color: GREEN }}>{meal.name}</span>
            {' '}({meal.time}) &mdash; {meal.calories} kcal
          </li>
        ))}
      </ul>
      {plan.notes && (
        <p className="pt-1 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {plan.notes}
        </p>
      )}
    </div>
  );
}