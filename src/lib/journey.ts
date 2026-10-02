// The intake journey (backend client-journey.service): the order of the
// steps, what each is called, and where each one is done.
//
//   Registration → Informed Consent → PAR-Q → Client Interview →
//   Fitness Assessment → Goals → PT Enrolment → Workout Plan
//
// The STATE of each step comes from GET /api/pt-os/clients/:id/journey — read
// live from the record each step produces — so a "next step" button can never
// point somewhere the server's gates will refuse.

import type { ScreeningSummary } from '@/lib/screening';

export type JourneyStepKey =
  | 'registration' | 'consent' | 'parq' | 'interview' | 'assessment' | 'goals' | 'enrolment' | 'workout_plan';
export type JourneyStepState = 'done' | 'in_progress' | 'todo' | 'blocked' | 'renew';

export interface JourneyStep {
  key: JourneyStepKey;
  state: JourneyStepState;
  optional?: boolean;
  /** Why the step is blocked, in words to show. */
  detail?: string;
}

export interface ClientJourney {
  steps: JourneyStep[];
  /** The first step not done, or null when the journey is complete. */
  next: JourneyStepKey | null;
  screening: ScreeningSummary;
}

export interface ClientInterview {
  id: string;
  client_id: string;
  status: 'draft' | 'completed';
  training_history: string | null;
  pain_and_injuries: string | null;
  lifestyle: string | null;
  motivation: string | null;
  availability: string | null;
  preferences: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const STEP_LABEL: Record<JourneyStepKey, string> = {
  registration: 'Registration',
  consent: 'Informed Consent',
  parq: 'PAR-Q screening',
  interview: 'Client Interview',
  assessment: 'Fitness Assessment',
  goals: 'Goals',
  enrolment: 'PT Enrolment',
  workout_plan: 'Workout Plan',
};

/** Where a step is done, for this client. Renewal goes to Renew, not Enrol. */
export function stepHref(key: JourneyStepKey, clientId: string, state?: JourneyStepState): string {
  const q = `client_id=${encodeURIComponent(clientId)}`;
  switch (key) {
    case 'registration': return `/pt-os/clients/${clientId}/edit`;
    case 'consent': return `/pt-os/informed-consent?${q}`;
    case 'parq': return `/pt-os/parq?${q}`;
    case 'interview': return `/pt-os/interview?${q}`;
    case 'assessment': return `/pt-os/assessment?${q}`;
    case 'goals': return `/pt-os/goals?${q}`;
    case 'enrolment': return state === 'renew' ? `/pt-os/clients/${clientId}/renew` : `/pt-os/clients/${clientId}/enroll`;
    case 'workout_plan': return `/pt-os/workout-plans?${q}`;
    default: return `/pt-os/clients/${clientId}`;
  }
}

/** The step after `key` in the journey, for "Continue to …" buttons. */
export function stepAfter(key: JourneyStepKey): JourneyStepKey | null {
  const order: JourneyStepKey[] = ['registration', 'consent', 'parq', 'interview', 'assessment', 'goals', 'enrolment', 'workout_plan'];
  const i = order.indexOf(key);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}
