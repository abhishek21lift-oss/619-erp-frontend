// The intake journey (backend client-journey.service): the order of the
// steps, what each is called, and where each one is done.
//
//   Welcome & Gym Tour → PT Enrolment → Informed Consent → PAR-Q →
//   Client Interview → Goals → Fitness Assessment → Program Design
//
// The STATE of each step comes from GET /api/pt-os/clients/:id/journey — read
// live from the record each step produces — so a "next step" button can never
// point somewhere the server's gates will refuse.

import type { ScreeningSummary } from '@/lib/screening';

export type JourneyStepKey =
  | 'welcome_tour' | 'enrolment' | 'consent' | 'parq' | 'interview' | 'goals' | 'assessment' | 'program_design';
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
  // Lifestyle & Training Readiness (migration 228)
  lifestyle_occupation?: string | null;
  lifestyle_sitting_hours?: number | null;
  lifestyle_screen_time?: string | null;
  lifestyle_sleep_hours?: number | null;
  lifestyle_meal_regularity?: string | null;
  lifestyle_smoking?: string | null;
  lifestyle_alcohol?: string | null;
  lifestyle_training_days?: number | null;
  // The redesigned interview's own fields (migration 254). `notes` is the
  // trainer's summary; every other field here is what the client said.
  job_details?: string | null;
  occupation_other_details?: string | null;
  previous_workout_experience?: 'never' | 'beginner' | 'intermediate' | 'advanced' | null;
  training_challenges?: string[] | null;
  challenge_other?: string | null;
  important_client_statements?: string | null;
}

export const STEP_LABEL: Record<JourneyStepKey, string> = {
  welcome_tour: 'Welcome & Gym Tour',
  enrolment: 'PT Enrolment',
  consent: 'Informed Consent',
  parq: 'PAR-Q screening',
  interview: 'Client Interview',
  goals: 'Goals',
  assessment: 'Fitness Assessment',
  program_design: 'Program Design',
};

/** Where a step is done, for this client. Renewal goes to Renew, not Enrol. */
export function stepHref(key: JourneyStepKey, clientId: string, state?: JourneyStepState): string {
  const q = `client_id=${encodeURIComponent(clientId)}`;
  switch (key) {
    case 'welcome_tour': return `/pt-os/welcome-tour?${q}`;
    case 'enrolment': return state === 'renew' ? `/pt-os/clients/${clientId}/renew` : `/pt-os/clients/${clientId}/enroll`;
    case 'consent': return `/pt-os/informed-consent?${q}`;
    case 'parq': return `/pt-os/parq?${q}`;
    case 'interview': return `/pt-os/interview?${q}`;
    case 'goals': return `/pt-os/goals?${q}`;
    case 'assessment': return `/pt-os/assessment?${q}`;
    case 'program_design': return `/pt-os/program-design?${q}`;
    default: return `/pt-os/clients/${clientId}`;
  }
}

/** The step after `key` in the journey, for "Continue to …" buttons. */
export function stepAfter(key: JourneyStepKey): JourneyStepKey | null {
  const order: JourneyStepKey[] = ['welcome_tour', 'enrolment', 'consent', 'parq', 'interview', 'goals', 'assessment', 'program_design'];
  const i = order.indexOf(key);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}
