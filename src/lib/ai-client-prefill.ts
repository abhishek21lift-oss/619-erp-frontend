/**
 * What the AI generators can know about a client before the trainer types
 * anything: the fetch, and the translation from each record's own vocabulary
 * into the form's.
 *
 * ── What is NOT here ────────────────────────────────────────────────────────
 *
 * Nothing is invented. A fact the record does not hold comes back '' and the
 * field keeps whatever the form started with; the server already prefers its
 * own record and labels anything the trainer states as stated, not on file.
 *
 * ── The translations ────────────────────────────────────────────────────────
 *
 * A stored value the form does not offer is translated where the mapping is
 * unambiguous, and dropped where it is not:
 *
 *   athlete              → advanced            (the form has three chips, not four)
 *   low / medium / high  → budget / moderate / premium   (nutrition_budget)
 *   'Sedentary' …        → sedentary …         (lifestyle labels → AI tokens)
 *   frequency '3x/week'  → '3'                 (the chips are 2–6)
 *
 * A number outside the schema's OWN STATED_RANGE is dropped rather than
 * filled: a prefilled value must never be able to fail the form's validation.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { STATED_RANGE } from '@/lib/forms/schemas/aiGenerator';

/** The workout form's fields, each '' when the record does not hold one. */
export type AiWorkoutFacts = {
  age: string;
  gender: string;
  weight_kg: string;
  height_cm: string;
  goal: string;
  experience_level: string;
  injuries: string;
  training_days: string;
};

/** The diet form's fields, same rule. */
export type AiDietFacts = {
  age: string;
  gender: string;
  weight_kg: string;
  height_cm: string;
  goal: string;
  activity_level: string;
  budget: string;
  meal_frequency: string;
  dietary_preferences: string;
  allergies: string;
};

export interface AiClientFacts {
  clientName: string;
  workout: AiWorkoutFacts;
  diet: AiDietFacts;
}

/* ── Vocabulary ──────────────────────────────────────────────────────────── */

const EXPERIENCE: Record<string, string> = {
  beginner: 'beginner', intermediate: 'intermediate', advanced: 'advanced', athlete: 'advanced',
};

const WORKOUT_GOAL: Record<string, string> = {
  weight_loss: 'weight_loss', fat_loss: 'weight_loss', muscle_gain: 'muscle_gain',
  strength: 'strength', endurance: 'endurance', general_fitness: 'general_fitness',
  flexibility: 'flexibility',
  // The studio's own goal. It was missing here AND from the model's schema, so
  // a body-recomposition client was shown, and programmed as, general fitness.
  body_recomposition: 'body_recomposition',
  recomposition: 'body_recomposition', recomp: 'body_recomposition',
};

const DIET_GOAL: Record<string, string> = {
  weight_loss: 'weight_loss', fat_loss: 'weight_loss', muscle_gain: 'muscle_gain',
  maintenance: 'maintenance', recomposition: 'recomposition', recomp: 'recomposition',
};

/** pt_lifestyle_assessments.activity_level stores display labels (`lib/lifestyle-calculations.ts`). */
const ACTIVITY: Record<string, string> = {
  sedentary: 'sedentary',
  lightly_active: 'lightly_active',
  moderately_active: 'moderately_active',
  active: 'very_active',
  very_active: 'very_active',
  extra_active: 'extra_active',
};

/** pt_nutrition_assessments.nutrition_budget is low/medium/high/premium. */
const BUDGET: Record<string, string> = {
  low: 'budget', budget: 'budget',
  medium: 'moderate', moderate: 'moderate',
  high: 'premium', premium: 'premium',
};

const GENDER: Record<string, string> = {
  male: 'male', m: 'male', female: 'female', f: 'female', other: 'other',
};

function token(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** A number inside the form's own range, as the string the field holds. */
function within(v: unknown, [min, max]: readonly [number, number]): string {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim());
  return Number.isFinite(n) && n >= min && n <= max ? String(n) : '';
}

/** Full years since `dob`, or '' when unknown, unparseable, or out of range. */
export function ageFromDob(dob: unknown, now = new Date()): string {
  const s = String(dob ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-').map(Number);
  let age = now.getUTCFullYear() - y;
  const beforeBirthday = now.getUTCMonth() + 1 < m || (now.getUTCMonth() + 1 === m && now.getUTCDate() < d);
  if (beforeBirthday) age -= 1;
  return within(age, STATED_RANGE.age);
}

export function mapGender(v: unknown): string { return GENDER[token(v)] ?? ''; }
export function mapExperience(v: unknown): string { return EXPERIENCE[token(v)] ?? ''; }
export function mapWorkoutGoal(v: unknown): string { return WORKOUT_GOAL[token(v)] ?? ''; }
export function mapDietGoal(v: unknown): string { return DIET_GOAL[token(v)] ?? ''; }
export function mapActivityLevel(v: unknown): string { return ACTIVITY[token(v)] ?? ''; }
export function mapBudget(v: unknown): string { return BUDGET[token(v)] ?? ''; }

/**
 * Training days, from the client's `frequency` text first ("3", "3x/week")
 * and the interview's structured answer second. The form's chips are 2–6.
 */
export function mapTrainingDays(frequency: unknown, interviewDays: unknown): string {
  const m = /(\d{1,2})/.exec(String(frequency ?? ''));
  const fromFrequency = m ? Number(m[1]) : NaN;
  if (fromFrequency >= 2 && fromFrequency <= 6) return String(fromFrequency);
  const n = Number(interviewDays);
  return Number.isFinite(n) && n >= 3 && n <= 6 ? String(Math.round(n)) : '';
}

/** Meals a day — the form's chips are 3–6. */
export function mapMealFrequency(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) && n >= 3 && n <= 6 ? String(Math.round(n)) : '';
}

/** A TEXT[] (or a legacy string) as one comma-separated line. */
export function joinList(v: unknown, max = 300): string {
  const joined = Array.isArray(v)
    ? v.map((x) => String(x ?? '').trim()).filter(Boolean).join(', ')
    : (typeof v === 'string' ? v.trim() : '');
  return joined.slice(0, max).trim();
}

function firstText(...vals: unknown[]): string {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function withinRange(v: unknown, max: number): string {
  const s = String(v ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

/* ── The fetch ───────────────────────────────────────────────────────────── */

type Row = Record<string, unknown>;

interface InterviewRow extends Row {
  status?: string;
  pain_and_injuries?: unknown;
  lifestyle_training_days?: unknown;
}

interface LifestyleRow extends Row {
  assessment_date?: unknown;
  activity_level?: unknown;
  workout_experience_level?: unknown;
  food_preferences?: unknown;
  meal_frequency?: unknown;
}

interface NutritionRow extends Row {
  assessment_date?: unknown;
  diet_preferences?: unknown;
  food_allergies?: unknown;
  foods_to_avoid?: unknown;
  meals_per_day?: unknown;
  nutrition_budget?: unknown;
}

interface GoalRow extends Row {
  goal_type?: unknown;
  is_active?: unknown;
  status?: unknown;
  created_at?: unknown;
}

function settled(r: PromiseSettledResult<unknown>): Row[] {
  if (r.status !== 'fulfilled') return [];
  const data = (r.value as { data?: unknown })?.data;
  return Array.isArray(data) ? (data as Row[]) : [];
}

function newest(rows: Row[], dateKey: string): Row | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => String(b[dateKey] ?? '').localeCompare(String(a[dateKey] ?? '')))[0] ?? null;
}

/** The client's own interview: a completed one beats the newest draft. */
function interviewRow(rows: Row[]): InterviewRow | null {
  const rowsTyped = rows as InterviewRow[];
  return rowsTyped.find((r) => r.status === 'completed') ?? rowsTyped[0] ?? null;
}

/**
 * One read per client, from the client row every AI generation is about, plus
 * the interview / lifestyle / nutrition / goal / assessment history both forms
 * draw on. Only the client row is required — a failed optional record means a
 * thinner prefill, not a failed one.
 */
export async function loadAiClientFacts(clientId: string): Promise<AiClientFacts> {
  const [
    clientRes, interviewRes, lifestyleRes, nutritionRes, goalsRes, assessmentsRes,
  ] = await Promise.allSettled([
    api.pt.client(clientId),
    api.pt.interviews.list(clientId),
    api.progress.lifestyleAssessments.list({ client_id: clientId }),
    api.progress.nutritionAssessments.list({ client_id: clientId }),
    // The two records the server prefers over the client row. Reading only
    // pt_clients.goal/frequency/weight meant the form could show the goal from
    // sign-up and the old typed weight while the prompt used the active goal
    // and the latest assessment.
    api.progress.goals.list({ client_id: clientId }),
    api.progress.assessments.list({ client_id: clientId }),
  ]);
  if (clientRes.status === 'rejected') throw clientRes.reason;

  const c = (((clientRes.value as { data?: unknown })?.data ?? {}) as Row);
  const interview = interviewRow(settled(interviewRes));
  const lifestyle = newest(settled(lifestyleRes), 'assessment_date') as LifestyleRow | null;
  const nutrition = newest(settled(nutritionRes), 'assessment_date') as NutritionRow | null;
  const goals = settled(goalsRes) as GoalRow[];
  const assessment = newest(settled(assessmentsRes), 'created_at');

  const activeGoal = goals.find((g) => g.is_active === true)
    ?? goals.find((g) => g.status === 'active')
    ?? null;

  const age = ageFromDob(c.dob);
  const gender = mapGender(c.gender);
  const weight_kg = within(assessment?.weight, STATED_RANGE.weight_kg)
    || within(c.weight, STATED_RANGE.weight_kg);
  const height_cm = within(c.height, STATED_RANGE.height_cm);
  const goal = firstText(activeGoal?.goal_type, c.goal);

  return {
    clientName: firstText(c.name) || 'this client',
    workout: {
      age, gender, weight_kg, height_cm,
      goal: mapWorkoutGoal(goal),
      experience_level: mapExperience(firstText(c.workout_experience_level, lifestyle?.workout_experience_level)),
      injuries: withinRange(firstText(c.injuries, interview?.pain_and_injuries), 500),
      training_days: mapTrainingDays(c.sessions_per_week, null)
        || mapTrainingDays(c.frequency, interview?.lifestyle_training_days),
    },
    diet: {
      age, gender, weight_kg, height_cm,
      goal: mapDietGoal(goal),
      activity_level: mapActivityLevel(lifestyle?.activity_level),
      budget: mapBudget(firstText(nutrition?.nutrition_budget, lifestyle?.nutrition_budget)),
      meal_frequency: mapMealFrequency(firstText(nutrition?.meals_per_day, lifestyle?.meal_frequency)),
      dietary_preferences: joinList(nutrition?.diet_preferences) || joinList(lifestyle?.food_preferences),
      allergies: joinList(nutrition?.food_allergies) || joinList(nutrition?.foods_to_avoid),
    },
  };
}

/** Did the record fill anything in this form's slice? Pairs with the "nothing saved yet" note. */
export function hasAnyFact(slice: Record<string, string>): boolean {
  return Object.values(slice).some((v) => String(v).trim() !== '');
}

/* ── The hook ────────────────────────────────────────────────────────────── */

export interface AiPrefill {
  /** null until loaded (and on failure) — never a half-filled record. */
  facts: AiClientFacts | null;
  loading: boolean;
  failed: boolean;
}

export function useAiClientPrefill(clientId: string | null): AiPrefill {
  const [state, setState] = useState<AiPrefill>({ facts: null, loading: false, failed: false });

  useEffect(() => {
    if (!clientId) { setState({ facts: null, loading: false, failed: false }); return; }
    let cancelled = false;
    setState({ facts: null, loading: true, failed: false });
    loadAiClientFacts(clientId)
      .then((facts) => { if (!cancelled) setState({ facts, loading: false, failed: false }); })
      .catch(() => { if (!cancelled) setState({ facts: null, loading: false, failed: true }); });
    return () => { cancelled = true; };
  }, [clientId]);

  return state;
}

/**
 * Apply one client's facts over the form, skipping every field the trainer
 * has already edited and every fact the record does not hold. Returns `prev`
 * unchanged when nothing applies, so a call that fills nothing does not
 * re-render the form.
 */
export function applyFacts<T extends Record<string, string>>(
  prev: T,
  patch: Partial<T>,
  edited: ReadonlySet<string>,
): T {
  let next = prev;
  for (const key of Object.keys(patch) as (keyof T & string)[]) {
    const value = patch[key];
    if (!value || edited.has(key) || next[key] === value) continue;
    if (next === prev) next = { ...prev };
    next[key] = value;
  }
  return next;
}
