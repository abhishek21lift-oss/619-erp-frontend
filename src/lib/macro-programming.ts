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

/** The goals a macrocycle can be built for, in display order. */
export const MACRO_GOALS: Array<{ value: MacroGoal; label: string }> = [
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'general_fitness', label: 'General fitness' },
  { value: 'powerlifting', label: 'Powerlifting' },
];

/** workout_plans_goal_check accepts these; the macro vocabulary is finer. */
const PLAN_GOAL: Record<MacroGoal, string> = {
  strength: 'strength',
  powerlifting: 'strength',
  hypertrophy: 'muscle_gain',
  fat_loss: 'weight_loss',
  endurance: 'endurance',
  general_fitness: 'general_fitness',
};

/** One programme per phase, in the shape POST /api/workouts/plans takes. */
export interface MacroPhasePlan {
  name: string;
  description: string;
  goal: string;
  duration_weeks: number;
  sessions_per_week: number;
}

/**
 * A phase is a programme: the trainer writes each one in the builder and
 * assigns it, so a macrocycle is stored in the same tables as any other plan.
 * The phase lengths add up to the block — nothing is invented.
 */
export function macroPhasePlans(input: MacroCycleInput): MacroPhasePlan[] {
  const { phases } = buildMacroCycle(input);
  const days = microCycleDays(input.daysPerWeek);
  const label = MACRO_GOALS.find((g) => g.value === input.goal)?.label ?? input.goal;
  return phases.map((phase) => {
    const first = phase.weeks[0];
    const last = phase.weeks[phase.weeks.length - 1];
    const span = phase.weeks.length === 1 ? `Week ${first}` : `Weeks ${first}–${last}`;
    return {
      name: `${label} — ${phase.name} (${span})`,
      description: `${span} · ${days.length} day${days.length === 1 ? '' : 's'}/week (${days.join(', ')}). Focus: ${phase.focus}.`,
      goal: PLAN_GOAL[input.goal],
      duration_weeks: phase.weeks.length,
      sessions_per_week: input.daysPerWeek,
    };
  });
}
