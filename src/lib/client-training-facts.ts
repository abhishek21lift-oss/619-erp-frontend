/**
 * The facts the training calculators prefill from a client's own record.
 *
 * Two reads, no invention. `trainingBrief` already assembles age, resting HR,
 * experience, goal and the last programme's frequency; the client row supplies
 * `sessions_per_week` / `frequency`, which the brief only sees through an
 * assignment. A fact neither holds comes back '' and the page leaves it blank.
 */

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface ClientTrainingFacts {
  name: string;
  age: string;
  restingHeartRate: string;
  experienceLevel: string;
  goal: string;
  trainingDays: string;
}

export interface TrainingPrefill {
  /** null until loaded (and on failure) — never a half-filled record. */
  facts: ClientTrainingFacts | null;
  loading: boolean;
  failed: boolean;
}

type Row = Record<string, unknown>;

function text(v: unknown): string {
  return String(v ?? '').trim();
}

function firstText(...vals: unknown[]): string {
  for (const v of vals) {
    const s = text(v);
    if (s) return s;
  }
  return '';
}

/** A whole number inside the range, as the string a field holds. */
function whole(v: unknown, min: number, max: number): string {
  const n = typeof v === 'number' ? v : Number(text(v));
  return Number.isInteger(n) && n >= min && n <= max ? String(n) : '';
}

/** "3", "3x/week" → '3'. The calculators accept 1–14 sessions. */
function daysFromFrequency(v: unknown): string {
  const m = /(\d{1,2})/.exec(text(v));
  return m ? whole(m[1], 1, 14) : '';
}

export async function loadClientTrainingFacts(clientId: string): Promise<ClientTrainingFacts> {
  const [briefRes, clientRes] = await Promise.allSettled([
    api.pt.trainingBrief(clientId),
    api.pt.client(clientId),
  ]);
  // A thinner prefill is fine; no prefill at all is reported by the page.
  if (briefRes.status === 'rejected' && clientRes.status === 'rejected') {
    throw briefRes.reason;
  }

  const brief = briefRes.status === 'fulfilled'
    ? (((briefRes.value as { data?: unknown })?.data ?? {}) as Row)
    : {};
  const c = clientRes.status === 'fulfilled'
    ? (((clientRes.value as { data?: unknown })?.data ?? {}) as Row)
    : {};

  const clientRow = (brief.client ?? {}) as Row;
  const body = (brief.body ?? {}) as Row;
  const lifestyle = (brief.lifestyle ?? {}) as Row;
  const goal = (brief.goal ?? {}) as Row;
  const history = (brief.history ?? {}) as Row;

  return {
    name: firstText(c.name, clientRow.name),
    age: whole(clientRow.age, 1, 120),
    restingHeartRate: whole(body.resting_hr, 25, 220),
    experienceLevel: firstText(lifestyle.experience_level, c.workout_experience_level),
    goal: firstText(goal.goal_type, clientRow.goal, c.goal),
    trainingDays: whole(c.sessions_per_week, 1, 14)
      || whole(history.days_per_week, 1, 14)
      || daysFromFrequency(c.frequency),
  };
}

export function useClientTrainingFacts(clientId: string | null): TrainingPrefill {
  const [state, setState] = useState<TrainingPrefill>({ facts: null, loading: false, failed: false });

  useEffect(() => {
    if (!clientId) { setState({ facts: null, loading: false, failed: false }); return; }
    let cancelled = false;
    setState({ facts: null, loading: true, failed: false });
    loadClientTrainingFacts(clientId)
      .then((facts) => { if (!cancelled) setState({ facts, loading: false, failed: false }); })
      .catch(() => { if (!cancelled) setState({ facts: null, loading: false, failed: true }); });
    return () => { cancelled = true; };
  }, [clientId]);

  return state;
}
