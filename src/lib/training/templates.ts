// How a workout describes itself in a list.
//
// Shared between the index and its test so the two cannot disagree about what
// an unnamed, goal-less, undated template reads as — which is the case that
// decides whether the card looks broken or merely quiet.

import type { WorkoutTemplate } from '@/lib/api';

/** The line under a template's name. Empty when it has nothing to say. */
export function describeTemplate(t: Pick<WorkoutTemplate,
  'day_label' | 'day_number' | 'goal' | 'estimated_duration_minutes'>): string {
  const day = t.day_label || (t.day_number ? `Day ${t.day_number}` : null);
  const mins = t.estimated_duration_minutes ? `${t.estimated_duration_minutes} min` : null;
  return [day, t.goal, mins].filter(Boolean).join(' · ');
}
