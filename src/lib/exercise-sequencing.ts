// Deterministic workout sequencing engine.
// Backend twin: 619-erp-backend/src/modules/pt-os/exercise-sequencing.js

export type Mechanic = 'compound' | 'isolation' | string;
export type MovementPattern = string;

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
}

export interface SequencedExercise extends SeqExercise {
  sequenceOrder: number;
  phase: string;
  reason: string;
}

const POWER_PATTERNS = new Set(['Olympic', 'Power', 'Plyometric']);
const HIGH_DEMAND = new Set(['Squat', 'Hinge', 'Vertical Push']);

function isPower(ex: SeqExercise): boolean {
  const cat = (ex.category || '').toLowerCase();
  if (cat.includes('olympic') || cat.includes('powerlifting') || cat.includes('plyometric')) return true;
  const name = ex.name.toLowerCase();
  return /clean|snatch|jerk|power clean|hang clean/.test(name);
}

function isCompound(ex: SeqExercise): boolean {
  return (ex.mechanic || '').toLowerCase() === 'compound';
}

function isCardio(ex: SeqExercise): boolean {
  const cat = (ex.category || '').toLowerCase();
  return cat.includes('cardio') || (ex.movementPattern || '').toLowerCase() === 'locomotion';
}

function phaseFor(ex: SeqExercise, idx: number): string {
  if (isPower(ex)) return 'Power / High-Skill';
  if (isCompound(ex)) return 'Primary Compound';
  if (isCardio(ex)) return 'Conditioning';
  return 'Accessory / Isolation';
}

function priority(ex: SeqExercise): number {
  // lower = earlier
  if (isPower(ex)) return 10;
  if (isCompound(ex) && HIGH_DEMAND.has(ex.movementPattern || '')) return 20;
  if (isCompound(ex)) return 30;
  if (isCardio(ex)) return 60;
  return 50;
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
    const pa = priority(a.e);
    const pb = priority(b.e);
    if (pa !== pb) return pa - pb;
    return a.i - b.i;
  });

  return sorted.map((item, idx) => {
    const ex = item.e;
    const p = priority(ex);
    let reason = '';
    if (isPower(ex)) reason = 'Power/high-skill movement placed early while fresh.';
    else if (isCompound(ex)) reason = 'Compound movement before isolation work.';
    else if (isCardio(ex)) reason = 'Conditioning placed after resistance work.';
    else reason = 'Accessory/isolation work placed later.';
    if (ex.locked) reason = 'Locked by trainer; order preserved.';
    return {
      ...ex,
      sequenceOrder: idx + 1,
      phase: phaseFor(ex, idx),
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
