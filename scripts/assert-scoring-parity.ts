#!/usr/bin/env tsx
/**
 * Do the two copies of the fitness scoring library still agree?
 *
 * ── The duplicate this guards ──────────────────────────────────────────────
 *
 * The same ~280-line library exists twice, once per repo:
 *
 *   frontend  src/lib/fitness-calculations.ts
 *   backend   src/modules/progress/fitness-scoring.js
 *
 * Same function names, same line numbers to within two or three, maintained by
 * hand in parallel. The frontend copy runs live in the assessment wizard so a
 * trainer watches a score change as they type; the backend copy recomputes on
 * POST and is what actually gets stored. They are the trainer's number and the
 * client's record, and nothing has ever checked that they are the same number.
 *
 * ── Why this is a script and not a unit test ───────────────────────────────
 *
 * Because the two implementations live in two deployables that cannot import
 * each other. The only place both exist at once is the E2E job, which already
 * checks out the backend beside the frontend for the cross-tenant suite — so
 * the check rides that existing dual checkout rather than inventing a second
 * mechanism for the same problem.
 *
 * ── Why it fails rather than skips when it cannot find the backend ─────────
 *
 * A parity check that quietly passes when it cannot compare anything is worse
 * than none: it reports green for the exact configuration where drift would go
 * unnoticed. Set SCORING_PARITY_OPTIONAL=1 to downgrade a missing backend to a
 * warning — for a contributor who has not cloned it — and never in CI.
 *
 * ── What it does NOT check ─────────────────────────────────────────────────
 *
 * That either implementation is CORRECT. Both could be wrong together and this
 * would pass. It checks that one number is shown and a different one stored,
 * which is the failure a trainer would report as "the score changed when I
 * saved it" and which no test could previously catch.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import * as FE_FITNESS from '../src/lib/fitness-calculations';
import * as FE_LIFESTYLE from '../src/lib/lifestyle-calculations';

const BACKEND_MODULE = 'src/modules/progress/fitness-scoring.js';
const LIFESTYLE_BACKEND_MODULE = 'src/modules/progress/lifestyle-scoring.js';

/** Where the backend checkout might be, in the order worth trying. */
function findBackend(moduleRelPath: string = BACKEND_MODULE): string | null {
  const candidates = [
    process.env.BACKEND_PATH,          // explicit, wins
    '../backend',                      // the E2E job's layout
    '../619-erp-backend',              // a side-by-side dev clone
  ].filter(Boolean) as string[];

  for (const base of candidates) {
    const p = resolve(process.cwd(), base, moduleRelPath);
    if (existsSync(p)) return p;
  }
  return null;
}

type Fn = (...args: unknown[]) => unknown;

const GENDERS = [null, 'male', 'female'];
const NUMS = [null, 0, 1, 17, 18.5, 25, 30, 45, 55, 60, 70, 82.5, 100, 120, 175, 200];

/**
 * A fine sweep, and why the coarse grid above is not enough on its own.
 *
 * Almost everything in this library is a THRESHOLD: a band edge, a cutoff, a
 * percentage. Moving one is the most likely way the two copies drift, and a
 * sparse grid cannot see it — it only notices if a sample happens to fall in
 * the sliver between the old edge and the new one.
 *
 * That is not hypothetical. The first version of this script sampled the
 * values above and was checked by moving checkAsymmetry's threshold from 10%
 * to 12% on the frontend only. It reported 8,705 calls and PASSED, because no
 * pair in the coarse grid is between 10% and 11.9% apart. A green check that
 * cannot see a moved threshold is worse than no check.
 *
 * Whole and half steps across the range every input to this library plausibly
 * takes, so a threshold cannot move by as little as half a unit unseen.
 */
const FINE: number[] = [];
for (let v = 0; v <= 220; v += 0.5) FINE.push(v);
const CATEGORIES = [null, 'poor', 'below_average', 'average', 'good', 'excellent', 'superior', 'nonsense'];
const BP_CATEGORIES = [null, 'normal', 'elevated', 'stage_1', 'stage_2', 'crisis', 'low'];

function buildFitnessCases(): Array<{ fn: string; args: unknown[] }> {
  const cases: Array<{ fn: string; args: unknown[] }> = [];
  const add = (fn: string, args: unknown[]) => cases.push({ fn, args });

  for (const w of NUMS) for (const h of NUMS) add('calcBmi', [w, h]);
  for (const a of NUMS) for (const b of NUMS) add('calcWhr', [a, b]);
  for (const w of NUMS) for (const f of NUMS) { add('calcLeanBodyMass', [w, f]); add('calcFatMass', [w, f]); }
  for (const w of NUMS) for (const h of [150, 175, 200]) for (const a of [null, 20, 45, 70]) for (const g of GENDERS) add('calcBmr', [w, h, a, g]);
  for (const s of NUMS) for (const d of NUMS) add('classifyBp', [s, d]);
  for (const v of NUMS) for (const a of [null, 20, 35, 50, 65]) for (const g of GENDERS) add('classifyVo2Max', [v, a, g]);
  for (const d of NUMS) add('calcVo2MaxCooper', [d]);
  for (const t of NUMS) add('calcVo2MaxBruce', [t]);
  for (const w of NUMS) for (const a of [null, 30, 50]) for (const g of GENDERS) for (const t of [null, 12, 15]) for (const hr of [null, 120, 160]) add('calcVo2MaxRockport', [w, a, g, t, hr]);
  for (const d of [null, 100, 180]) for (const p1 of NUMS) for (const p2 of [null, 40, 60]) for (const p3 of [null, 35, 55]) add('calcHarvardPei', [d, p1, p2, p3]);
  for (const p of NUMS) add('classifyHarvardPei', [p]);
  for (const hr of NUMS) add('classifyStepTestRecovery', [hr]);
  for (const w of NUMS) for (const r of [null, 0, 1, 5, 10, 12, 20, 37]) for (const f of ['brzycki', 'epley']) add('calc1RM', [w, r, f]);
  for (const o of NUMS) for (const bw of NUMS) for (const ex of [null, 'bench_press', 'squat', 'deadlift', 'unknown']) for (const g of GENDERS) add('classifyStrength', [o, bw, ex, g]);
  for (const tt of [null, 'plank', 'push_up', 'sit_up', 'unknown']) for (const v of NUMS) for (const g of GENDERS) add('classifyEndurance', [tt, v, g]);
  for (const l of NUMS) for (const r of NUMS) add('checkAsymmetry', [l, r]);
  for (const s of NUMS) add('classifyFlexibilityScore', [s]);

  // ── The boundary sweeps ────────────────────────────────────────────────
  //
  // Every function whose answer is decided by a cutoff gets walked across its
  // whole range in half-unit steps, so moving an edge cannot hide between two
  // samples. See the comment on FINE.
  for (const v of FINE) {
    add('classifyFlexibilityScore', [v]);
    add('classifyHarvardPei', [v]);
    add('classifyStepTestRecovery', [v]);
    add('calcVo2MaxCooper', [v * 20]);
    add('calcVo2MaxBruce', [v / 10]);
    add('calcBmi', [v, 175]);
    add('calcWhr', [v, 100]);
    for (const g of GENDERS) {
      add('scoreBodyComposition', [v / 2, g]);
      add('classifyVo2Max', [v / 2, 35, g]);
      add('classifyEndurance', ['plank', v, g]);
      add('classifyStrength', [v * 2, 80, 'bench_press', g]);
    }
    add('scoreHealthRisk', ['normal', v / 4]);
    // Asymmetry is a RATIO, so one side is pinned and the other walked: this
    // is the sweep that the 10%-to-12% drift slipped through.
    add('checkAsymmetry', [100, v]);
    add('checkAsymmetry', [v, 100]);
  }
  for (let reps = 1; reps <= 30; reps += 1) {
    for (const f of ['brzycki', 'epley']) { add('calc1RM', [60, reps, f]); add('calc1RM', [100.5, reps, f]); }
  }
  for (const c of CATEGORIES) add('scoreCategory', [c]);
  for (const f of NUMS) for (const g of GENDERS) add('scoreBodyComposition', [f, g]);
  for (const bp of BP_CATEGORIES) for (const bmi of NUMS) add('scoreHealthRisk', [bp, bmi]);
  for (const a of [null, 0, 40, 60, 100]) for (const b of [null, 0, 40, 60, 100]) add('scoreEnduranceBattery', [a, b]);
  for (const a of [null, 0, 50, 100]) for (const b of [null, 50]) for (const c of [null, 75]) add('computeOverallScore', [{ cardio: a, strength: b, endurance: c }]);

  return cases;
}


// ── Lifestyle ───────────────────────────────────────────────────────────────
//
// The second hand-maintained pair, and the one that had actually drifted. The
// lifestyle wizard previously substituted 3 L for an absent water reading
// before classifying hydration; the backend classified the stored value, which
// is null. classifyHydration(3) scores 85 and lands in the composite mean,
// classifyHydration(null) is dropped from it — so the Lifestyle Score on the
// review screen sat several points above the one being written, and could
// report a different readiness band than the record it created.
//
// Nothing could have caught that: this check covered fitness-calculations only.

const SMOKING = [null, 'never', 'former', 'occasionally', 'daily', 'nonsense'];
const ALCOHOL = [null, 'never', 'occasionally', 'weekly', 'frequently', 'nonsense'];
const STEPS_BRACKETS = [null, '<3000', '3000_5000', '5000_8000', '8000_10000', '10000_plus', 'nonsense'];
const OCCUPATIONS = [null, 'desk_job', 'driver', 'student', 'retired', 'physical_labor', 'active_job', 'fitness_professional', 'police', 'nonsense'];
const BREAKFAST = [null, 'daily', 'sometimes', 'never', 'nonsense'];
const RECOVERY_QUALITY = [null, 'poor', 'average', 'good', 'excellent', 'nonsense'];
const SCORES = [null, 0, 25, 39, 40, 41, 50, 54, 55, 56, 70, 85, 100];

function buildLifestyleCases(): Array<{ fn: string; args: unknown[] }> {
  const cases: Array<{ fn: string; args: unknown[] }> = [];
  const add = (fn: string, args: unknown[]) => cases.push({ fn, args });

  // Hydration and the 1-10 scales are pure thresholds, so they get the same
  // half-step treatment the fitness cutoffs get — see the comment on FINE.
  for (let v = 0; v <= 8; v += 0.1) add('classifyHydration', [Number(v.toFixed(1))]);
  add('classifyHydration', [null]);

  for (let d = 0; d <= 14; d += 0.5) for (const q of [null, 1, 3, 5, 7, 10]) add('classifySleep', [d, q]);
  for (let q = 0; q <= 10; q += 0.5) add('classifySleep', [8, q]);
  add('classifySleep', [null, null]);

  for (let lv = 0; lv <= 10; lv += 0.5) add('calcStressScore', [lv]);
  add('calcStressScore', [null]);

  for (const b of STEPS_BRACKETS) for (const o of OCCUPATIONS) add('classifyActivity', [b, o]);

  for (const mf of [null, 0, 1, 2, 3, 4, 5, 6, 8]) for (const bh of BREAKFAST) for (const ln of [null, true, false]) {
    add('calcNutritionScore', [mf, bh, ln]);
  }

  for (const ss of SCORES) for (const st of SCORES) for (const en of [null, 1, 5, 10]) for (const rq of RECOVERY_QUALITY) {
    add('calcRecoveryScore', [ss, st, en, rq]);
  }

  for (let v = 0; v <= 100; v += 0.5) add('classifyRisk', [v]);
  add('classifyRisk', [null]);

  // The two habit functions take an object, so the sweep walks one field at a
  // time against a fixed rest — a full cross product would be millions.
  const baseHabits = {
    smokingStatus: null, alcoholStatus: null, sleepScore: 70, stressScore: 70,
    hydrationScore: 70, activityScore: 70, nutritionScore: 70,
  };
  for (const sm of SMOKING) for (const al of ALCOHOL) {
    add('calcHabitRiskScore', [{ ...baseHabits, smokingStatus: sm, alcoholStatus: al }]);
    add('buildLifestyleRiskFactors', [{ ...baseHabits, smokingStatus: sm, alcoholStatus: al }]);
  }
  for (const field of ['sleepScore', 'stressScore', 'hydrationScore', 'activityScore', 'nutritionScore']) {
    for (let v = 0; v <= 100; v += 0.5) {
      add('calcHabitRiskScore', [{ ...baseHabits, [field]: v }]);
      add('buildLifestyleRiskFactors', [{ ...baseHabits, [field]: v }]);
    }
    add('calcHabitRiskScore', [{ ...baseHabits, [field]: null }]);
    add('buildLifestyleRiskFactors', [{ ...baseHabits, [field]: null }]);
  }

  // The composite. A null component must be DROPPED from the mean, not counted
  // as zero and not substituted — which is the exact bug above.
  const baseSix = { sleep: 70, stress: 70, hydration: 70, activity: 70, nutrition: 70, recovery: 70 };
  for (const field of Object.keys(baseSix)) {
    for (const v of [null, 0, 25, 50, 85, 100]) {
      for (const hr of [null, 0, 20, 50, 100]) add('calcLifestyleScore', [{ ...baseSix, [field]: v }, hr]);
    }
  }
  add('calcLifestyleScore', [{ sleep: null, stress: null, hydration: null, activity: null, nutrition: null, recovery: null }, null]);

  for (let v = 0; v <= 100; v += 0.5) add('classifyLifestyleReadiness', [v]);
  add('classifyLifestyleReadiness', [null]);

  return cases;
}

/** Compared as JSON so null and undefined cannot read as equal by accident. */
const norm = (v: unknown) => JSON.stringify(v === undefined ? null : v);

interface Suite {
  name: string;
  frontend: Record<string, unknown>;
  backendModule: string;
  cases: Array<{ fn: string; args: unknown[] }>;
  /** Below this, the grid or the export surface moved and the run proves nothing. */
  minCalls: number;
}

/** Compare one suite. Returns the mismatch lines; prints its own summary. */
function runSuite(suite: Suite, backendPath: string): string[] {
  const BE = createRequire(import.meta.url)(backendPath) as Record<string, unknown>;

  const mismatches: string[] = [];
  const uncomparable = new Set<string>();
  let compared = 0;

  for (const { fn, args } of suite.cases) {
    const fe = suite.frontend[fn];
    const be = BE[fn];
    if (typeof fe !== 'function' || typeof be !== 'function') { uncomparable.add(fn); continue; }

    let a: unknown;
    let b: unknown;
    // A thrown error is an outcome too: one side throwing where the other
    // returns null is drift the trainer would see as a crashed wizard.
    try { a = (fe as Fn)(...args); } catch (e) { a = `THREW:${(e as Error).message}`; }
    try { b = (be as Fn)(...args); } catch (e) { b = `THREW:${(e as Error).message}`; }
    compared += 1;
    if (norm(a) !== norm(b)) {
      mismatches.push(`  [${suite.name}] ${fn}(${args.map(norm).join(', ')})\n    frontend → ${norm(a)}\n    backend  → ${norm(b)}`);
    }
  }

  const functions = new Set(suite.cases.map((c) => c.fn)).size;
  console.info(`scoring parity [${suite.name}]: ${compared} calls across ${functions - uncomparable.size} shared functions`);
  console.info(`  backend: ${backendPath}`);

  // Cannot pass vacuously: an empty or tiny comparison means the grid or the
  // export surface changed underneath this, which is itself a failure.
  if (compared < suite.minCalls) {
    console.error(`✗ [${suite.name}] only ${compared} calls compared — the grid or the exports moved; this cannot be trusted`);
    process.exit(1);
  }

  if (uncomparable.size) {
    // Named, not silently dropped. A function that exists on one side only is
    // how the two copies begin to diverge.
    console.warn(`⚠ [${suite.name}] present on one side only, not compared: ${[...uncomparable].sort().join(', ')}`);
  }

  return mismatches;
}

function main() {
  // Both libraries live in the same backend checkout, so one lookup failure is
  // the same failure for both — but each is resolved by its own path so a
  // module that moves is named precisely rather than reported as "no backend".
  const suites: Array<Omit<Suite, 'cases'> & { build: () => Suite['cases'] }> = [
    {
      name: 'fitness',
      frontend: FE_FITNESS as unknown as Record<string, unknown>,
      backendModule: BACKEND_MODULE,
      build: buildFitnessCases,
      minCalls: 10000,
    },
    {
      name: 'lifestyle',
      frontend: FE_LIFESTYLE as unknown as Record<string, unknown>,
      backendModule: LIFESTYLE_BACKEND_MODULE,
      build: buildLifestyleCases,
      minCalls: 1000,
    },
  ];

  const resolved: Array<{ suite: Suite; path: string }> = [];
  for (const s of suites) {
    const path = findBackend(s.backendModule);
    if (!path) {
      const message = `scoring parity: backend not found (looked for ${s.backendModule} under `
        + '$BACKEND_PATH, ../backend, ../619-erp-backend)';
      if (process.env.SCORING_PARITY_OPTIONAL === '1') {
        console.warn(`⚠ ${message} — skipped because SCORING_PARITY_OPTIONAL=1`);
        return;
      }
      console.error(`✗ ${message}`);
      console.error('  A parity check that cannot compare anything must not report green.');
      process.exit(1);
    }
    resolved.push({ suite: { ...s, cases: s.build() }, path });
  }

  const mismatches = resolved.flatMap(({ suite, path }) => runSuite(suite, path));

  if (mismatches.length) {
    console.error(`\n✗ ${mismatches.length} mismatch(es) — the number a trainer sees is not the number that gets stored:\n`);
    for (const m of mismatches.slice(0, 25)) console.error(m);
    if (mismatches.length > 25) console.error(`  … and ${mismatches.length - 25} more`);
    process.exit(1);
  }

  console.info('✓ the two copies agree on every compared input');
}

main();
