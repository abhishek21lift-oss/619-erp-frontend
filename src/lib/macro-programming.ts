// Macro/meso/micro cycle planning helpers.

export type MacroGoal = 'strength' | 'hypertrophy' | 'endurance' | 'fat_loss' | 'general_fitness' | 'powerlifting';

export interface MacroCycleInput {
  goal: MacroGoal;
  totalWeeks: number;
  daysPerWeek: number;
  includeDeload?: boolean;
}

export interface MacroPhase {
  name: string;
  weeks: number[];
  focus: string;
}

export function buildMacroCycle(input: MacroCycleInput): { phases: MacroPhase[]; weeks: number[] } {
  const { goal, totalWeeks, includeDeload } = input;
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  const phases: MacroPhase[] = [];

  if (totalWeeks <= 4) {
    phases.push({ name: 'Accumulation', weeks: [...weeks], focus: 'Volume and technique' });
    return { phases, weeks };
  }

  // Simple 3-phase split: accumulation (60%), intensification (25%), deload/peak (15%)
  const accumEnd = Math.max(1, Math.round(totalWeeks * 0.6));
  const intensEnd = Math.max(accumEnd + 1, Math.round(totalWeeks * 0.85));
  phases.push({ name: 'Accumulation', weeks: weeks.slice(0, accumEnd), focus: 'Volume accumulation' });
  phases.push({ name: 'Intensification', weeks: weeks.slice(accumEnd, intensEnd), focus: 'Intensity increase' });
  phases.push({ name: 'Deload / Peak', weeks: weeks.slice(intensEnd), focus: includeDeload ? 'Deload then peak' : 'Peak' });

  if (goal === 'strength' || goal === 'powerlifting') {
    phases[1].focus = 'Heavy singles/doubles';
  }
  return { phases, weeks };
}

export function microCycleDays(daysPerWeek: number): string[] {
  const labels = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  return labels.slice(0, Math.max(1, Math.min(7, daysPerWeek)));
}

export function deloadWeek(loadMultiplier: number = 0.6): number {
  return loadMultiplier;
}
