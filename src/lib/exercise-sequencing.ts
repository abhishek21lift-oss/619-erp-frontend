// Deterministic workout sequencing engine.
// Backend twin: 619-erp-backend/src/modules/pt-os/exercise-sequencing.js

export type Mechanic = 'compound' | 'isolation' | string;
export type MovementPattern = string;

// ── Module 4 metadata ──────────────────────────────────────────────────────
//
// Every field below is OPTIONAL. Rows written before this metadata existed
// carry none of it, and the engine must sequence them exactly as it always
// did rather than invent a classification — a guessed "unsupported" is a
// safety claim nobody reviewed.

export type JointAction = 'compound' | 'isolation';
/** `unknown` is a real value: the trainer has not classified the movement. */
export type StructuralStatus = 'supported' | 'unsupported' | 'unknown';
export type ExerciseTool =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'bodyweight'
  | 'plate-loaded-machine'
  | 'selectorized-machine'
  | 'smith-machine'
  | 'band'
  | 'other';
export type ForceLine = 'vertical' | 'horizontal' | 'diagonal' | 'rotational' | 'mixed' | 'unknown';

export interface SeqExercise {
  id: string;
  name: string;
  mechanic?: Mechanic;
  movementPattern?: MovementPattern;
  category?: string; // e.g. 'Powerlifting', 'Olympic Weightlifting', 'Plyometrics', 'Cardio'
  difficulty?: string;
  equipment?: string;
  locked?: boolean;
  order?: number;

  // Module 4 structured metadata. Absent/`unknown` means "not reviewed yet".
  jointAction?: JointAction;
  structuralStatus?: StructuralStatus;
  tools?: ExerciseTool[];
  forceLine?: ForceLine;
  /** Explicit trainer review; never inferred from an exercise name. */
  powerPriority?: boolean;
}

export interface SequencedExercise extends SeqExercise {
  sequenceOrder: number;
  phase: string;
  reason: string;
}

const POWER_PATTERNS = new Set(['Olympic', 'Power', 'Plyometric']);
const HIGH_DEMAND = new Set(['Squat', 'Hinge', 'Vertical Push']);

/**
 * Power work. `powerPriority` is the reviewed answer; the category/name check
 * below is the pre-Module 4 heuristic kept for rows that have no metadata yet.
 * It is not extended to new guesses.
 */
export function isPowerExercise(ex: SeqExercise): boolean {
  if (ex.powerPriority === true) return true;
  const cat = (ex.category || '').toLowerCase();
  if (cat.includes('olympic') || cat.includes('powerlifting') || cat.includes('plyometric')) return true;
  const name = ex.name.toLowerCase();
  return /clean|snatch|jerk|power clean|hang clean/.test(name);
}

/** Joint action, from the reviewed field when present and `mechanic` otherwise. */
export function isCompoundExercise(ex: SeqExercise): boolean {
  return ((ex.jointAction ?? ex.mechanic) || '').toLowerCase() === 'compound';
}

export function isIsolationExercise(ex: SeqExercise): boolean {
  return ((ex.jointAction ?? ex.mechanic) || '').toLowerCase() === 'isolation';
}

export function isCardioExercise(ex: SeqExercise): boolean {
  const cat = (ex.category || '').toLowerCase();
  return cat.includes('cardio') || (ex.movementPattern || '').toLowerCase() === 'locomotion';
}

/**
 * Session order, lower = earlier:
 *   10  power / high-skill
 *   15  unsupported structural compound (needs bracing, placed while fresh)
 *   20  high-demand compound without reviewed structural status (legacy)
 *   30  other compound
 *   50  accessory / isolation
 *   60  conditioning
 * An exercise with no `structuralStatus` never reaches tier 15: the engine
 * cannot know whether it is supported.
 */
export function exercisePriority(ex: SeqExercise): number {
  if (isPowerExercise(ex)) return 10;
  if (isCompoundExercise(ex)) {
    if (ex.structuralStatus === 'unsupported') return 15;
    if (HIGH_DEMAND.has(ex.movementPattern || '')) return 20;
    return 30;
  }
  if (isCardioExercise(ex)) return 60;
  return 50;
}

function phaseFor(ex: SeqExercise): string {
  if (isPowerExercise(ex)) return 'Power / High-Skill';
  if (isCompoundExercise(ex)) return 'Primary Compound';
  if (isCardioExercise(ex)) return 'Conditioning';
  return 'Accessory / Isolation';
}

export function sequenceWorkout(exercises: SeqExercise[]): SequencedExercise[] {
  // Respect locked items: keep their relative order anchors by sorting unlocked
  // around them is complex; here we do stable sort by (locked?0:1, priority, original index).
  const indexed = exercises.map((e, i) => ({ e, i }));
  const sorted = [...indexed].sort((a, b) => {
    // locked items keep original relative order among themselves
    const la = a.e.locked ? 0 : 1;
    const lb = b.e.locked ? 0 : 1;
    if (la !== lb) return la - lb;
    if (a.e.locked && b.e.locked) return a.i - b.i;
    const pa = exercisePriority(a.e);
    const pb = exercisePriority(b.e);
    if (pa !== pb) return pa - pb;
    return a.i - b.i;
  });

  return sorted.map((item, idx) => {
    const ex = item.e;
    let reason = '';
    if (isPowerExercise(ex)) reason = 'Power/high-skill movement placed early while fresh.';
    else if (isCompoundExercise(ex) && ex.structuralStatus === 'unsupported') {
      reason = 'Unsupported structural compound placed after power work, while bracing is fresh.';
    } else if (isCompoundExercise(ex)) reason = 'Compound movement before isolation work.';
    else if (isCardioExercise(ex)) reason = 'Conditioning placed after resistance work.';
    else reason = 'Accessory/isolation work placed later.';
    if (ex.locked) reason = 'Locked by trainer; order preserved.';
    return {
      ...ex,
      sequenceOrder: idx + 1,
      phase: phaseFor(ex),
      reason,
    };
  });
}

export function reorderExercises(exercises: SeqExercise[], fromIndex: number, toIndex: number): SeqExercise[] {
  const arr = [...exercises];
  const [moved] = arr.splice(fromIndex, 1);
  arr.splice(toIndex, 0, moved);
  return arr;
}
