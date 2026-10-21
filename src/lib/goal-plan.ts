// K11 Goal Setting — pure planning helpers for the wizard.
//
// Framework-free and side-effect-free. Unlike goal-calculations.ts /
// goal-scheduling.ts these are NOT twins of a backend engine: the backend
// stores what the wizard sends verbatim (milestones, the coaching block on
// routine_blueprint), so there is nothing server-side to stay in sync with.
// See docs/goal-setting-coaching-fields.md in 619-erp-backend for the
// proposed first-class columns that would replace the JSONB homes.

export type MilestoneTier = 'short_term' | 'medium_term' | 'long_term';

export interface GoalMilestone {
  type: MilestoneTier;
  label: string;
  date: string;
  description: string;
}

export interface BarrierPlan {
  challenge: string;
  plan: string;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'flexible';

export const MILESTONE_TIERS: { value: MilestoneTier; label: string; hint: string }[] = [
  { value: 'short_term', label: 'Short term', hint: 'First checkpoint — habits and consistency' },
  { value: 'medium_term', label: 'Medium term', hint: 'Mid-point review — measurable progress' },
  { value: 'long_term', label: 'Long term', hint: 'Final target — the goal achieved' },
];

export const SESSION_MINUTES = [30, 45, 60, 75, 90] as const;

/**
 * Select-provided numbers arrive as strings; the platform's coercion ratchet
 * (src/__tests__/form-platform-ratchet.test.ts) requires every parse of form
 * state to be a guarded helper in a lib module, not a bare parseInt at the
 * call site. Both bounds mirror the UI limits (1–7 days, 1–52 weeks).
 */
export function trainingDaysFrom(value: string, fallback = 3): number {
  const days = parseInt(String(value), 10);
  return Number.isFinite(days) ? Math.min(7, Math.max(1, days)) : fallback;
}

export function weeksFrom(value: string, fallback: number): number {
  const weeks = parseInt(String(value), 10);
  return Number.isFinite(weeks) ? Math.min(52, Math.max(1, weeks)) : fallback;
}


export const TIME_OF_DAY_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'flexible', label: 'Flexible' },
];

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function isoAddDays(iso: string, days: number): string {
  // Pure UTC arithmetic avoids timezone shifts (e.g. IST) that turn a +56-day
  // addition into a date one day off.
  const [yStr, mStr, dStr] = iso.split('-');
  const y = parseInt(yStr, 10), m = parseInt(mStr, 10), d = parseInt(dStr, 10);
  const date = Date.UTC(y, m - 1, d + days);
  const result = new Date(date);
  const yy = result.getUTCFullYear();
  const mm = String(result.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(result.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Suggested short/medium/long milestones from the goal window. These are
 * prefills only — the trainer edits or deletes them in the wizard, and what
 * is saved is exactly what they confirmed.
 */
export function defaultMilestones(
  startDate: string,
  targetDate?: string | null,
  shortWeeks = 8,
  mediumWeeks = 12,
): GoalMilestone[] {
  const out: GoalMilestone[] = [];
  const seen = new Set<string>();
  const push = (m: GoalMilestone) => {
    if (m.date && !seen.has(m.date)) { seen.add(m.date); out.push(m); }
  };

  if (shortWeeks > 0) {
    push({
      type: 'short_term',
      label: `Week ${shortWeeks} checkpoint`,
      date: isoAddDays(startDate, shortWeeks * 7),
      description: 'Weekly training consistent, nutrition plan followed',
    });
  }
  if (mediumWeeks > 0 && mediumWeeks !== shortWeeks) {
    push({
      type: 'medium_term',
      label: `Week ${mediumWeeks} review`,
      date: isoAddDays(startDate, mediumWeeks * 7),
      description: 'Reassess weight / body fat and adjust the plan',
    });
  }
  if (targetDate && targetDate > startDate) {
    push({
      type: 'long_term',
      label: 'Goal achieved',
      date: targetDate,
      description: 'Target reached and verified by assessment',
    });
  }
  return out;
}

/**
 * Milestone form validation. Returns the first problem, or undefined.
 * Empty list is allowed: milestones are an enhancement, not a gate.
 */
export function validateMilestones(
  milestones: GoalMilestone[],
  startDate: string,
  targetDate?: string | null,
): string | undefined {
  for (const m of milestones) {
    if (!m.label.trim()) return 'Every milestone needs a title.';
    if (!m.date) return 'Every milestone needs a target date.';
    if (m.date < startDate) return 'Milestone dates cannot be before today.';
    if (targetDate && m.date > targetDate) return 'Milestone dates cannot be after the goal target date.';
  }
  // A short-term milestone dated after a medium-term one reads as a sequence
  // that runs backwards, which is how date typos slip through.
  const order: MilestoneTier[] = ['short_term', 'medium_term', 'long_term'];
  let prevMax = '';
  for (const tier of order) {
    const dates = milestones.filter((m) => m.type === tier).map((m) => m.date);
    if (!dates.length) continue;
    const min = dates.reduce((a, b) => (a < b ? a : b));
    if (prevMax && min < prevMax) return 'Milestones must run short term → medium term → long term.';
    prevMax = dates.reduce((a, b) => (a > b ? a : b));
  }
  return undefined;
}

/** Weekly time commitment in minutes, or null when either input is unusable. */
export function weeklyCommitmentMinutes(trainingDays: number | string, sessionMinutes: number | string): number | null {
  const days = parseInt(String(trainingDays), 10);
  const minutes = parseInt(String(sessionMinutes), 10);
  if (!Number.isFinite(days) || !Number.isFinite(minutes) || days <= 0 || minutes <= 0) return null;
  return days * minutes;
}

export function formatWeeklyCommitment(minutes: number | null): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min/week`;
  if (m === 0) return `${h} h/week`;
  return `${h} h ${m} min/week`;
}

export interface SmartCheckInput {
  goalType: string;
  goalName: string;
  statement: string;
  successMetric: string;
  targetWeight: string;
  targetBodyFat: string;
  targetDate: string;
}

export interface SmartCheckRow {
  key: 'S' | 'M' | 'A' | 'R' | 'T';
  label: string;
  done: boolean;
  detail: string;
}

/**
 * The SMART checklist shown live in the builder step and in the review.
 * Each row is derived from what has actually been entered — nothing is
 * marked done on a promise, and the "still missing" line says what to add.
 */
export function smartChecklist(input: SmartCheckInput, opts: { priorityGoal: string; today?: string } = { priorityGoal: '' }): SmartCheckRow[] {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const hasTargets = !!input.targetWeight.trim() || !!input.targetBodyFat.trim();
  const hasMeasure = hasTargets || !!input.successMetric.trim();
  const hasTime = !!input.targetDate && input.targetDate >= today;
  const specific = input.goalType === 'custom'
    ? input.goalName.trim().length > 0 && input.statement.trim().length > 0
    : input.statement.trim().length > 0;

  return [
    { key: 'S', label: 'Specific', done: specific, detail: 'Describe exactly what the client wants to achieve.' },
    { key: 'M', label: 'Measurable', done: hasMeasure, detail: 'Add a target number or a success metric.' },
    { key: 'A', label: 'Achievable', done: hasTargets && hasTime, detail: 'Add targets and a deadline so the plan can be checked.' },
    { key: 'R', label: 'Relevant', done: !!opts.priorityGoal, detail: 'Pick the top priority this goal serves.' },
    { key: 'T', label: 'Time-bound', done: hasTime, detail: 'Set a target date today or later.' },
  ];
}

/** One plan row per selected challenge, keeping any plan already typed. */
export function barrierPlansFor(challenges: string[], existing: BarrierPlan[] = []): BarrierPlan[] {
  return challenges.map((challenge) => ({
    challenge,
    plan: existing.find((e) => e.challenge === challenge)?.plan ?? '',
  }));
}

/** Only plans the trainer actually wrote; an empty list is stored as null. */
export function barrierPayload(plans: BarrierPlan[]): BarrierPlan[] {
  return plans.filter((p) => p.plan.trim().length > 0).map((p) => ({ challenge: p.challenge, plan: p.plan.trim() }));
}
