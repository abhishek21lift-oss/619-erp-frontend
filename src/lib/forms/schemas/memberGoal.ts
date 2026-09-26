/**
 * A goal a member sets for themselves (POST /api/me/goals).
 *
 * Bounds mirror the server's (member-goals.service normaliseGoal) so a value
 * it would refuse is refused here first, next to the field. The rules that
 * need the member's records — "you have already lifted that", "that is your
 * weight already" — are the server's, and come back as a form error.
 */

import { z } from 'zod';
import { dateField, decimalField, enumField, textField } from '../primitives';
import type { MeGoalInput, MeGoalKind } from '@/lib/api';

export const GOAL_KINDS = ['lift', 'weight', 'sessions'] as const satisfies readonly MeGoalKind[];

const LIMITS: Record<MeGoalKind, [number, number]> = { weight: [25, 300], lift: [1, 500], sessions: [1, 1000] };

function isoDay(offsetDays: number, from: Date = new Date()): string {
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

export const memberGoalSchema = (now: Date = new Date()) => z
  .object({
    kind: enumField(GOAL_KINDS, { label: 'Goal type', required: true }),
    exercise: textField({ label: 'Exercise', maxLength: 120 }),
    target: decimalField({ label: 'Target', min: 1, max: 1000 }),
    targetDate: dateField({ label: 'Target date', min: isoDay(1, now), max: isoDay(3 * 365, now) }),
  })
  .superRefine((v, ctx) => {
    if (v.target === null) {
      ctx.addIssue({ code: 'custom', path: ['target'], message: 'Set a target.' });
      return;
    }
    if (!v.kind) return;
    const [min, max] = LIMITS[v.kind];
    if (v.target < min || v.target > max) {
      ctx.addIssue({ code: 'custom', path: ['target'], message: `Target must be between ${min} and ${max}.` });
    }
    if (v.kind === 'sessions' && !Number.isInteger(v.target)) {
      ctx.addIssue({ code: 'custom', path: ['target'], message: 'Sessions must be a whole number.' });
    }
    if (v.kind === 'lift' && !v.exercise) {
      ctx.addIssue({ code: 'custom', path: ['exercise'], message: 'Choose the exercise.' });
    }
  });

export type MemberGoalValues = z.output<ReturnType<typeof memberGoalSchema>>;

export type MemberGoalState = { kind: string; exercise: string; target: string; targetDate: string };

export function blankMemberGoal(kind: MeGoalKind = 'lift', exercise = ''): MemberGoalState {
  return { kind, exercise, target: '', targetDate: '' };
}

export function toMemberGoalPayload(v: MemberGoalValues): MeGoalInput {
  const out: MeGoalInput = { kind: v.kind as MeGoalKind, target_value: v.target as number };
  if (v.kind === 'lift' && v.exercise) out.exercise_name = v.exercise;
  if (v.targetDate) out.target_date = v.targetDate;
  return out;
}
