/**
 * Member milestones, derived from /api/me/achievements.
 *
 * Every milestone is a threshold on a number the server counted from what was
 * logged — sessions, personal bests, volume lifted, weeks in a row — so a
 * badge is earned only by something that happened. Nothing is dated, because
 * the server does not know WHEN a threshold was crossed; the page says
 * "earned", never "earned on".
 *
 * Weight milestones are deliberately absent: losing 5 kg is a win for one
 * member and a setback for another, and the goal field is free text.
 */

import type { MeAchievements } from '@/lib/api';

export type MilestoneKind = 'sessions' | 'prs' | 'volume' | 'streak';

export type Milestone = {
  id: string;
  kind: MilestoneKind;
  title: string;
  /** What it takes, in words. */
  detail: string;
  target: number;
  value: number;
  earned: boolean;
};

const DEFS: { kind: MilestoneKind; targets: number[]; title: (n: number) => string; detail: (n: number) => string }[] = [
  {
    kind: 'sessions',
    targets: [1, 10, 25, 50, 100, 200],
    title: (n) => (n === 1 ? 'First session' : `${n} sessions`),
    detail: (n) => (n === 1 ? 'Log your first session' : `Train ${n} sessions`),
  },
  {
    kind: 'prs',
    targets: [1, 10, 25, 50],
    title: (n) => (n === 1 ? 'First PR' : `${n} PRs`),
    detail: (n) => (n === 1 ? 'Set a personal best' : `Set ${n} personal bests`),
  },
  {
    kind: 'volume',
    targets: [1000, 10000, 50000, 100000],
    title: (n) => `${n / 1000} t lifted`,
    detail: (n) => `Lift ${(n / 1000).toLocaleString('en-IN')} tonne${n === 1000 ? '' : 's'} in total`,
  },
  {
    kind: 'streak',
    targets: [4, 8, 12, 26],
    title: (n) => `${n}-week streak`,
    detail: (n) => `Train ${n} weeks in a row`,
  },
];

function valueOf(kind: MilestoneKind, a: MeAchievements): number {
  switch (kind) {
    case 'sessions': return a.totals.sessions;
    case 'prs': return a.totals.prs;
    case 'volume': return a.totals.volume_kg;
    case 'streak': return a.training.longest;
  }
}

export function milestones(a: MeAchievements): Milestone[] {
  return DEFS.flatMap((d) => d.targets.map((target) => {
    const value = valueOf(d.kind, a);
    return {
      id: `${d.kind}-${target}`,
      kind: d.kind,
      title: d.title(target),
      detail: d.detail(target),
      target,
      value,
      earned: value >= target,
    };
  }));
}

/** The locked milestone closest to being earned, by fraction complete. */
export function nextMilestone(list: Milestone[]): Milestone | null {
  const locked = list.filter((m) => !m.earned && m.value > 0);
  if (locked.length === 0) return list.find((m) => !m.earned) ?? null;
  return locked.reduce((best, m) => (m.value / m.target > best.value / best.target ? m : best));
}

/** "3 sessions to go", "2.4 t to go", "1 more week". */
export function remainingLabel(m: Milestone): string {
  const left = Math.max(0, m.target - m.value);
  switch (m.kind) {
    case 'sessions': return `${left} session${left === 1 ? '' : 's'} to go`;
    case 'prs': return `${left} PR${left === 1 ? '' : 's'} to go`;
    case 'volume': return `${(left / 1000).toFixed(left >= 10000 ? 0 : 1)} t to go`;
    case 'streak': return `${left} more week${left === 1 ? '' : 's'} in a row`;
  }
}

/** Tonnes with one decimal under 10, whole above: "0.9 t", "12 t". */
export function tonnes(kg: number): string {
  const t = kg / 1000;
  return `${t < 10 ? t.toFixed(1) : Math.round(t).toLocaleString('en-IN')} t`;
}
