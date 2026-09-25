'use client';

/**
 * One-tap AI workout / diet generation for the client already on screen.
 *
 * Sits directly above the Client Login card on the client profile.
 *
 * It sends the CLIENT ID and nothing else. The backend resolves age, gender,
 * weight, height, goal, experience and training days from that client's own
 * record, names the column each came from, and reports the ones it cannot
 * find — see modules/pt-os/client-facts.js.
 *
 * That is a correction. This card used to post height 175, weight 75, gender
 * male, age 30, experience beginner and four training days for every client
 * whose record did not hold them, with a comment saying it "fills those with
 * the same defaults the AI coach uses elsewhere". The prompt then printed all
 * six under the heading CLIENT AUTHORITATIVE DATA, so the model programmed for
 * a person who did not exist and the trainer could not tell which numbers were
 * measured and which were invented on the way out of the browser.
 *
 * GenerationContextPanel now shows what the server actually holds before the
 * button is pressed, and a client missing a goal, an experience level or a
 * training frequency is refused with those fields named rather than generated
 * around.
 *
 * A generated WORKOUT can now be saved. Until this card grew its Save button
 * the generator could not write a plan anywhere: every consumer of a generated
 * programme rendered it and stopped, which is why production showed 95
 * generations and 9 live plans — the nine were typed by hand. Saving sends the
 * generation id, never the plan, so what lands is exactly what was screened
 * and audited server-side.
 *
 * Saving now also says whether the programme is LIVE. That used to be a
 * question with one answer — no — because accepting a proposal wrote a plan
 * and assigned it to nobody, so it reached no screen and no logged session
 * could be attributed to it. The backend assigns it; this reports what that
 * did, including when the client ends up on more programmes than the session
 * log can choose between.
 *
 * A generated DIET is still preview-only: nothing on the backend materialises
 * one, and a Save button that silently did nothing would be worse than none.
 *
 * The workout response also carries the safety screen, the rule audit, a
 * quality score and a second model's critique. Those are rendered by
 * GenerationEvidence, directly above the Save button, because approval is the
 * final gate in this design and a gate held by somebody who was shown less
 * than the server knew is not a gate.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, ArrowRight, Dumbbell, Loader2, RotateCcw, Salad, Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import type {
  AiDietPlan, AiWorkoutContext, AiWorkoutGenerationResult, AiWorkoutPlan,
} from '@/lib/api';
import GenerationEvidence from './GenerationEvidence';
import GenerationContextPanel from './GenerationContextPanel';
import TrainerStatedFields, { type StatedValues } from './TrainerStatedFields';
import { useToast } from '@/lib/toast';
import { palette, rgba } from '@/lib/palette';
import { errorMessage } from '@/lib/forms/errors';

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

// computeAge() and goalFor() used to live here, returning 30 for a client with
// no date of birth and 'general_fitness' for one with no goal. Both are now
// the server's to answer, and its answer for a client it has no record for is
// "NOT RECORDED" rather than a plausible substitute.

/** Server field keys, in the words the rest of this card uses. */
const FIELD_WORDS: Record<string, string> = {
  age: 'date of birth', gender: 'gender', weight_kg: 'weight', height_cm: 'height',
  activity_level: 'activity level', goal: 'goal', experience_level: 'experience level',
  training_days: 'sessions per week',
};

/**
 * "Missing required fields: height_cm, activity_level" is the diet endpoint's
 * refusal, and it reached the trainer verbatim — column names in a toast.
 * Rewritten into what to record; any other message passes through unchanged.
 */
function readableError(msg: string): string {
  const m = /^Missing required fields:\s*(.+)$/i.exec(msg.trim());
  if (!m) return msg;
  const names = m[1].split(',').map((k) => FIELD_WORDS[k.trim()] ?? k.trim().replace(/_/g, ' '));
  return `Record ${names.join(', ')} on the client first — the plan can't be worked out without ${names.length === 1 ? 'it' : 'them'}.`;
}

export default function ClientAiGenerateCard({ client, goalType }: ClientAiGenerateCardProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<'workout' | 'diet' | null>(null);
  const [context, setContext] = useState<AiWorkoutContext | null>(null);
  const [contextFailed, setContextFailed] = useState(false);
  // What the trainer knows that the record does not. Sent as their statement,
  // never written to the client, and never able to overwrite a recorded value.
  const [stated, setStated] = useState<StatedValues>({});
  // ── New block, or the next weeks of the one they are on? ─────────────────
  //
  // The server refuses to choose: generating over a live programme silently
  // creates a second one, and silently adapting would stop a trainer ever
  // starting a new block. So when there is a live programme this becomes a
  // required choice rather than a default.
  //
  // 'adapt' is the initial selection because it is the conservative one — it
  // continues what the client has already adapted to rather than replacing it
  // — but the trainer still has to press a button either way.
  const [mode, setMode] = useState<'new' | 'adapt'>('adapt');
  const [result, setResult] = useState<{
    kind: 'workout' | 'diet';
    plan: AiWorkoutPlan | AiDietPlan;
    /**
     * The ledger row this proposal was recorded as. Null when the server could
     * not record it — generation is never blocked on its own bookkeeping — and
     * without it there is nothing to save against, so the button is hidden
     * rather than shown and then failing.
     */
     generationId?: string | null;
    /**
     * The screen, audit, quality score and critique that came back with the
     * plan. Workout only — the diet endpoint returns none of it, and an
     * evidence block under a diet would be claiming checks nobody ran.
     */
    evidence?: AiWorkoutGenerationResult;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // State updates are async; a ref is the guard that actually stops a double
  // tap from billing the studio for two generations.
  const busyRef = useRef(false);

  /**
   * What the server holds about this client, read before anything is
   * generated.
   *
   * Best-effort and non-blocking: a summary that failed to load must not stop
   * a trainer generating, so the panel simply does not render. What it must
   * never do is render a guess — the state is null, not a filled-in default.
   */
  const loadContext = useCallback(async () => {
    try {
      setContext(await api.ai.workoutContext(client.id));
      setContextFailed(false);
    } catch {
      // ── A failed context is not an absent one ────────────────────────────
      //
      // This used to `setContext(null)` and say nothing, so a summary that
      // failed to load looked exactly like a client the panel had nothing to
      // say about. The trainer then pressed Generate having been shown
      // nothing, and read the result as though the checks had run.
      //
      // The state is kept apart from `context` because the two mean different
      // things: null is "not loaded yet", failed is "we asked and could not
      // find out". Generation is still allowed — the server resolves its own
      // context and will refuse on its own terms — but the screen stops
      // implying it knows anything.
      setContext(null);
      setContextFailed(true);
    }
  }, [client.id]);

  useEffect(() => { void loadContext(); }, [loadContext]);

  const generate = async (kind: 'workout' | 'diet') => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    setResult(null);
    setError(null);

    try {
      if (kind === 'workout') {
        // The client id, and nothing else. Every fact the prompt states comes
        // from that client's record on the server, which also names the column
        // it read and reports what it could not find.
        // The client id, plus anything the trainer explicitly stated for this
        // one generation. Nothing here is a claim about who the client is: the
        // server prefers its own record for every field but equipment, and
        // marks whatever it takes from here as `stated`.
        const res = await api.ai.generateWorkout({
          client_id: client.id,
          // Only when the client is on a live programme. Sending it otherwise
          // would be answering a question the server never asked.
          ...(onLiveProgramme ? { mode } : {}),
          ...(stated.goal ? { goal: stated.goal } : {}),
          ...(stated.experience_level ? { experience_level: stated.experience_level } : {}),
          ...(stated.training_days ? { training_days: Number(stated.training_days) } : {}),
          ...(stated.equipment ? { equipment: stated.equipment } : {}),
          ...(stated.injuries ? { injuries: stated.injuries } : {}),
        });
        setResult({ kind, plan: res.data, generationId: res.generation_id ?? null, evidence: res });
        // The record may have been edited between page load and generation,
        // and the response carries the resolution that actually happened.
        void loadContext();
      } else {
        // The diet generator still needs body metrics it has no column for on
        // a thin record — they drive the calorie target — so it answers with
        // the field list rather than being handed invented ones. That message
        // is now shown instead of being papered over with 175cm and 75kg.
        const res = await api.ai.generateDiet({ client_id: client.id });
        setResult({ kind, plan: res.data });
      }
    } catch (err) {
      const msg = readableError(errorMessage(err, 'Generation failed. Please try again.'));
      setError(msg);
      toast.error(msg);
      // A refused generation is usually a record problem, and the panel is
      // where the trainer reads which field to fill in.
      void loadContext();
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  /**
   * Save the proposal as a real programme.
   *
   * Sends the generation id and nothing else. The unresolved list comes back
   * on SUCCESS: an exercise the library does not hold cannot be stored at all,
   * and roughly one generated name in eight is one, so the trainer is told
   * which to add in the builder rather than finding a short session later.
   */
  const save = async () => {
    // A ref, not the `saving` state, for the same reason `busyRef` guards
    // generation: setSaving is async, so two quick taps can both pass a state
    // check before React re-renders and disables the button. The backend
    // refuses the second accept with a 409 either way — the stamp is
    // conditional on accepted_plan_id IS NULL — but the trainer would see an
    // error toast for a save that worked.
    if (!result || result.kind !== 'workout' || !result.generationId || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const out = await api.workouts.plans.saveFromGeneration({ generation_id: result.generationId });
      const missed = out.unresolved.length;
      const message = missed
        ? `Saved ${out.saved} exercises. ${missed} not in the library — add them in the builder: `
          + out.unresolved.map((u) => u.name).join(', ')
        : `Saved ${out.saved} exercises to ${out.name}`;

      // Whether it is LIVE is a separate fact from whether it saved, and until
      // the backend started assigning the plan it was always "no": the
      // programme existed in a table, appeared on no screen, and no logged
      // session could ever point back at it. Saying which of the three states
      // this save landed in is the difference between a trainer expecting the
      // client on Today and wondering where they went.
      const clash = out.other_active_assignments ?? 0;
      const detail = out.assigned === false
        ? `Saved, but not assigned — it will not appear on ${client.name}'s Today.`
        : clash > 0
          ? `${client.name} is now on ${clash + 1} active programmes, so starting a session `
            + 'will no longer pick one automatically — choose the programme each time, '
            + 'or finish the older ones.'
          : out.assigned
            ? `Now live for ${client.name}.`
            : undefined;

      // A warning, not a success, for the one case the trainer has to act on.
      if (clash > 0) toast.warning(message, { description: detail });
      else toast.success(message, detail ? { description: detail } : undefined);

      router.push(`/pt-os/workout-plans/${out.plan_id}/builder`);
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the programme'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const label = result?.kind === 'workout' ? 'AI workout' : 'AI diet';
  // What the server says is missing and blocking. Empty when the context could
  // not be loaded: an unavailable summary must not lock the button, because
  // the server is still the thing that decides and it will say so.
  // Blocking fields the trainer has not supplied for this generation. A value
  // typed above is a real answer to "the record does not have this", so it
  // opens the button — the server applies the same rule and would accept it.
  const program = context?.current_program;
  const onLiveProgramme = Boolean(program?.active && !program.expired);

  const blockedFields = (context?.data_quality.blocking ?? [])
    .filter((f) => !(f in stated && String(stated[f as keyof StatedValues] ?? '').trim()));

  const canSave = result?.kind === 'workout' && Boolean(result.generationId);

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
        {context && <GenerationContextPanel context={context} />}
        {contextFailed && (
          <div
            role="status"
            className="mt-3 flex items-start gap-1.5 rounded-[12px] px-3 py-2.5 text-[11.5px] leading-relaxed"
            style={{ background: rgba(palette.amber[500], 0.1), color: palette.amber[600], border: '1px solid var(--border)' }}
          >
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>
              <strong className="font-[750]">Client context could not be verified.</strong>{' '}
              What the AI would use could not be read. You can still generate &mdash; the server
              resolves the client&rsquo;s record itself and will refuse if anything it needs is
              missing &mdash; but nothing here has been checked.
            </span>
          </div>
        )}
        <TrainerStatedFields context={context} values={stated} onChange={setStated} />

        {onLiveProgramme && program?.active && (
          <div
            className="mt-2 rounded-[12px] px-3 py-2.5"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            <p className="mb-1.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <strong className="font-[750]">{program.plan_name ?? 'A programme'}</strong> is running
              {program.current_week ? ` — week ${program.current_week}${program.duration_weeks ? ` of ${program.duration_weeks}` : ''}` : ''}.
            </p>
            <div className="flex gap-1.5">
              {([
                ['adapt', 'Progress it', 'Continue the block, changing only what the evidence supports'],
                ['new', 'Start a new one', 'Write a fresh programme alongside it'],
              ] as const).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  aria-pressed={mode === value}
                  title={hint}
                  className="flex-1 rounded-[10px] px-2 py-1.5 text-[11.5px] font-[700] transition-colors"
                  style={mode === value
                    ? { background: rgba(BLUE, 0.12), color: BLUE, border: `1px solid ${rgba(BLUE, 0.35)}` }
                    : { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void generate('workout')}
            // Disabled on the same condition the server refuses on, read from
            // the server's own answer rather than re-derived here. The panel
            // above names the fields; a button that looks live and then 422s
            // teaches a trainer to distrust the screen.
            disabled={busy !== null || blockedFields.length > 0}
            title={blockedFields.length > 0 ? `Record ${blockedFields.join(', ')} first` : undefined}
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
            // Secondary, not a second saturated slab. Two full-colour buttons
            // stacked read as two equally loud alarms; the workout is the one
            // that saves as a programme, so it carries the weight.
            className="flex h-[44px] w-full items-center justify-center gap-1.5 rounded-[13px] px-3 text-[12.5px] font-[720] transition-colors active:scale-[0.985] disabled:opacity-45"
            style={{
              background: 'var(--bg-elevated)',
              color: palette.emerald[600],
              border: `1px solid ${rgba(GREEN, 0.4)}`,
            }}
          >
            {busy === 'diet'
              ? <><Loader2 size={14} className="animate-spin" /> Generating AI Diet...</>
              : <><Salad size={14} /> Generate AI Diet</>}
          </button>
          {/* The diet also needs height and activity level, which the panel
              above (built for the workout) does not list. Said before the
              press, not after a refusal. */}
          {context?.facts.height_cm?.origin === 'missing' && (
            <p className="text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              The diet also needs height and activity level on file.
            </p>
          )}
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

              {result.evidence && <GenerationEvidence result={result.evidence} />}

              {canSave ? (
                <div className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2.5"
                  style={{ borderColor: 'var(--border)' }}>
                  <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                    Not saved yet.
                  </p>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[720] text-white transition-opacity disabled:opacity-60"
                    style={{ background: BLUE, boxShadow: `0 4px 12px ${rgba(BLUE, 0.32)}` }}
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                    {saving ? 'Saving' : 'Save as programme'}
                  </button>
                </div>
              ) : (
                <p className="mt-2 border-t pt-1.5 text-[10.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  {/* A diet has nowhere to be saved to, and a workout whose
                      ledger row was not written has nothing to save against.
                      Both say so rather than offering a button that fails. */}
                  Preview only &mdash; nothing has been saved to {client.name}&rsquo;s record.
                </p>
              )}
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