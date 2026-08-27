'use client';

// Assign a workout plan to a client, with the PAR-Q gate surfaced honestly.
//
// There used to be two copies of this: the Workout Plans page's "Assign"
// button handled the backend's screening gate properly — a blocked client
// gets a persistent, actionable toast naming PAR-Q; missing paperwork gets a
// warning with a link to start it. New Programme's own assign-on-create call
// caught every failure, PARQ_BLOCKED included, behind one generic "could not
// assign it" toast fired an instant before the page navigated to the
// builder. On a phone that toast was gone before anyone read it, so a
// trainer would build out a whole programme believing it was already on
// their client and only find out otherwise back on the client's profile.
// One implementation now, so both call sites report the real reason.

import { api } from '@/lib/api';
import type { WorkoutPlan } from '@/lib/api';
import { ApiError } from '@/lib/http';
import type { useToast } from '@/lib/toast';

type Toast = ReturnType<typeof useToast>['toast'];

export async function assignWorkoutPlan(
  plan: Pick<WorkoutPlan, 'id' | 'name'>,
  client: { id: string; name: string },
  toast: Toast,
  goToParq: (clientId: string) => void,
): Promise<boolean> {
  try {
    const res = await api.workouts.assign({ workout_plan_id: plan.id, client_id: client.id });
    toast.success(`Assigned "${plan.name}" to ${client.name}.`);
    if (res?.screening_warnings?.length) {
      toast.warning(`${client.name}: ${res.screening_warnings.join(' ')}`, {
        duration: 8000,
        action: { label: 'Start PAR-Q', onClick: () => goToParq(client.id) },
      });
    }
    return true;
  } catch (err: unknown) {
    const code = err instanceof ApiError ? err.code : undefined;
    if (code === 'PARQ_BLOCKED') {
      // duration: 0 — this must not disappear on its own, because the
      // dialog's own submit navigates away right after this call returns.
      toast.error(`${client.name}'s PAR-Q screening flags them as medically blocked — clearance is required before assigning a workout.`, {
        duration: 0,
        action: { label: 'Review PAR-Q', onClick: () => goToParq(client.id) },
      });
    } else {
      toast.error(err instanceof Error ? err.message : 'Failed to assign workout plan.');
    }
    return false;
  }
}
