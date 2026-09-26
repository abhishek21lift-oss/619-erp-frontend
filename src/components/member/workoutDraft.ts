/**
 * Guided workout: the workout in progress, kept on the phone.
 *
 * Nothing is sent until the member taps Finish — then the whole workout goes
 * to the server in one request (see the backend's member-training.service).
 * Until then it lives here and in localStorage, so a locked phone, a reload or
 * a dropped connection never loses a set.
 *
 * Pure functions and types only; the screen is GuidedWorkout.tsx.
 */

import type { MeLastPerformance, MeWorkoutLogInput } from '@/lib/api';

export type DraftSet = {
  /** Kept as text while typing ("62.", ""), parsed when used. */
  weight: string;
  reps: string;
  done: boolean;
};

export type DraftExercise = {
  name: string;
  /** "3 × 8–10 · 60 kg" — what the trainer prescribed, if anything. */
  prescription: string | null;
  rest_seconds: number | null;
  notes: string | null;
  media_url: string | null;
  video_url: string | null;
  /** Heaviest completed set ever, kg — for the "new best" moment. */
  best_kg: number | null;
  /** "60 kg × 8, 65 kg × 6" — the last session's sets, as a reminder. */
  last_summary: string | null;
  /** 'YYYY-MM-DD' of that session. */
  last_date: string | null;
  sets: DraftSet[];
};

export type WorkoutDraft = {
  version: 1;
  request_id: string;
  started_at: string;
  title: string;
  assignment_id: string | null;
  program_name: string | null;
  workout_day: string | null;
  current: number;
  exercises: DraftExercise[];
};

export const DRAFT_KEY = 'member.workout.draft';
export const DEFAULT_REST = 90;
/** A draft older than this is a workout that was abandoned, not paused. */
const DRAFT_MAX_AGE_MS = 12 * 3_600_000;

/** First whole number in a prescription like "8-10" or "12 each side". */
export function firstInt(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const m = /\d+/.exec(String(v));
  return m ? Number(m[0]) : null;
}

export function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** "62.5" not "62.50000001"; "" for null. */
export function fmtKg(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return String(Math.round(n * 100) / 100);
}

export function prescriptionOf(x: { sets: number | null; reps: string | number | null; target_weight: number | null }): string | null {
  const parts = [
    x.sets && x.reps ? `${x.sets} × ${x.reps}` : x.sets ? `${x.sets} sets` : x.reps ? `${x.reps} reps` : null,
    x.target_weight != null ? `${fmtKg(x.target_weight)} kg` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

export const keyOf = (name: string) => name.trim().toLowerCase();

/**
 * The sets to start an exercise with. Weights and reps come from, in order:
 * the same set last time, the last set last time, the trainer's target.
 * Nothing is ticked done — a pre-filled number is a suggestion.
 */
export function prefillSets(
  planned: { sets: number | null; reps: string | number | null; target_weight: number | null },
  last: MeLastPerformance[string] | undefined,
): DraftSet[] {
  const count = Math.max(1, Math.min(10, planned.sets ?? last?.sets.length ?? 3));
  const plannedReps = firstInt(planned.reps);
  return Array.from({ length: count }, (_, i) => {
    const prev = last?.sets[i] ?? last?.sets[last.sets.length - 1];
    const weight = prev?.weight_kg ?? planned.target_weight ?? null;
    const reps = plannedReps ?? prev?.reps ?? null;
    return { weight: fmtKg(weight), reps: reps === null ? '' : String(reps), done: false };
  });
}

/** Build a draft from planned exercises and what the member did last time. */
export function newDraft(input: {
  title: string;
  assignment_id?: string | null;
  program_name?: string | null;
  workout_day?: string | null;
  exercises: {
    name: string;
    sets: number | null;
    reps: string | number | null;
    target_weight: number | null;
    rest_seconds?: number | null;
    notes?: string | null;
    media_url?: string | null;
    video_url?: string | null;
  }[];
  last: MeLastPerformance;
  now?: Date;
  requestId?: string;
}): WorkoutDraft {
  return {
    version: 1,
    request_id: input.requestId ?? newRequestId(),
    started_at: (input.now ?? new Date()).toISOString(),
    title: input.title,
    assignment_id: input.assignment_id ?? null,
    program_name: input.program_name ?? null,
    workout_day: input.workout_day ?? null,
    current: 0,
    exercises: input.exercises.map((x) => ({
      name: x.name,
      prescription: prescriptionOf(x),
      rest_seconds: x.rest_seconds ?? null,
      notes: x.notes ?? null,
      media_url: x.media_url ?? null,
      video_url: x.video_url ?? null,
      best_kg: input.last[keyOf(x.name)]?.best_kg ?? null,
      last_summary: lastSummary(input.last[keyOf(x.name)]),
      last_date: input.last[keyOf(x.name)]?.date?.slice(0, 10) ?? null,
      sets: prefillSets(x, input.last[keyOf(x.name)]),
    })),
  };
}

/** "60 kg × 8, 65 kg × 6", "12 reps", "10 min" — at most four sets. */
export function lastSummary(last: MeLastPerformance[string] | undefined): string | null {
  if (!last || last.sets.length === 0) return null;
  const one = (s: MeLastPerformance[string]['sets'][number]) => {
    if (s.weight_kg !== null && s.reps !== null) return `${fmtKg(s.weight_kg)} kg × ${s.reps}`;
    if (s.reps !== null) return `${s.reps} reps`;
    if (s.duration_seconds !== null) return `${Math.round(s.duration_seconds / 60)} min`;
    return null;
  };
  const parts = last.sets.map(one).filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.length > 4 ? `${parts.slice(0, 4).join(', ')} +${parts.length - 4}` : parts.join(', ');
}

export function newRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** A set that counts: ticked, with reps. */
export function isLogged(s: DraftSet): boolean {
  return s.done && (num(s.reps) ?? 0) > 0;
}

export function loggedSetCount(d: WorkoutDraft): number {
  return d.exercises.reduce((n, x) => n + x.sets.filter(isLogged).length, 0);
}

/** Exercises with at least one logged set. */
export function exercisesDone(d: WorkoutDraft): number {
  return d.exercises.filter((x) => x.sets.some(isLogged)).length;
}

export function volumeOf(d: WorkoutDraft): number {
  let v = 0;
  for (const x of d.exercises) for (const s of x.sets) {
    if (isLogged(s)) v += (num(s.weight) ?? 0) * (num(s.reps) ?? 0);
  }
  return Math.round(v);
}

/**
 * Would this set beat the member's heaviest ever? A hint for the moment — the
 * server decides what is a personal best when the workout is saved. A first
 * ever lift (no history) is not called a PR here either.
 */
export function beatsBest(set: DraftSet, best: number | null | undefined): boolean {
  const w = num(set.weight);
  return best !== null && best !== undefined && w !== null && w > best && (num(set.reps) ?? 0) > 0;
}

/** The request body: ticked sets only, exercises with none dropped. */
export function toLogInput(d: WorkoutDraft, now: Date = new Date()): MeWorkoutLogInput {
  const minutes = Math.round((now.getTime() - new Date(d.started_at).getTime()) / 60_000);
  return {
    request_id: d.request_id,
    assignment_id: d.assignment_id,
    program_name: d.program_name,
    workout_day: d.workout_day,
    duration_minutes: Math.max(1, Math.min(300, minutes)),
    exercises: d.exercises
      .map((x) => ({
        name: x.name,
        sets: x.sets.filter(isLogged).map((s) => ({ weight_kg: num(s.weight), reps: num(s.reps) })),
      }))
      .filter((x) => x.sets.length > 0),
  };
}

// ── Persistence ──────────────────────────────────────────────────────────────
// Browser storage can be unavailable (private mode, blocked site data): every
// access is guarded, and the workout still works — it just will not survive
// a reload.

export function saveDraft(d: WorkoutDraft): void {
  try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* the workout carries on in memory */ }
}

export function clearDraft(): void {
  try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* nothing stored to clear */ }
}

/** The saved workout, if there is a recent, well-formed one. */
export function loadDraft(now: Date = new Date()): WorkoutDraft | null {
  let raw: string | null = null;
  try { raw = window.localStorage.getItem(DRAFT_KEY); } catch { return null; }
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as WorkoutDraft;
    const age = now.getTime() - new Date(d.started_at).getTime();
    if (d.version !== 1 || !Array.isArray(d.exercises) || d.exercises.length === 0
      || !Number.isFinite(age) || age > DRAFT_MAX_AGE_MS) {
      clearDraft();
      return null;
    }
    return d;
  } catch {
    clearDraft();
    return null;
  }
}
