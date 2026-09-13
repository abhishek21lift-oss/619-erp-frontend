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
import * as FE from '../src/lib/fitness-calculations';

const BACKEND_MODULE = 'src/modules/progress/fitness-scoring.js';

/** Where the backend checkout might be, in the order worth trying. */
function findBackend(): string | null {
  const candidates = [
    process.env.BACKEND_PATH,          // explicit, wins
    '../backend',                      // the E2E job's layout
    '../619-erp-backend',              // a side-by-side dev clone
  ].filter(Boolean) as string[];

  for (const base of candidates) {
    const p = resolve(process.cwd(), base, BACKEND_MODULE);
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

function buildCases(): Array<{ fn: string; args: unknown[] }> {
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

/** Compared as JSON so null and undefined cannot read as equal by accident. */
const norm = (v: unknown) => JSON.stringify(v === undefined ? null : v);

function main() {
  const backendPath = findBackend();
  if (!backendPath) {
    const message = `scoring parity: backend not found (looked for ${BACKEND_MODULE} under `
      + `$BACKEND_PATH, ../backend, ../619-erp-backend)`;
    if (process.env.SCORING_PARITY_OPTIONAL === '1') {
      console.warn(`⚠ ${message} — skipped because SCORING_PARITY_OPTIONAL=1`);
      return;
    }
    console.error(`✗ ${message}`);
    console.error('  A parity check that cannot compare anything must not report green.');
    process.exit(1);
  }

  const BE = createRequire(import.meta.url)(backendPath) as Record<string, unknown>;
  const frontend = FE as unknown as Record<string, unknown>;

  const cases = buildCases();
  const mismatches: string[] = [];
  const uncomparable = new Set<string>();
  let compared = 0;

  for (const { fn, args } of cases) {
    const fe = frontend[fn];
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
      mismatches.push(`  ${fn}(${args.map(norm).join(', ')})\n    frontend → ${norm(a)}\n    backend  → ${norm(b)}`);
    }
  }

  const functions = new Set(cases.map((c) => c.fn)).size;
  console.info(`scoring parity: ${compared} calls across ${functions - uncomparable.size} shared functions`);
  console.info(`  backend: ${backendPath}`);

  // Cannot pass vacuously: an empty or tiny comparison means the grid or the
  // export surface changed underneath this, which is itself a failure.
  if (compared < 10000) {
    console.error(`✗ only ${compared} calls compared — the grid or the exports moved; this cannot be trusted`);
    process.exit(1);
  }

  if (uncomparable.size) {
    // Named, not silently dropped. A function that exists on one side only is
    // how the two copies begin to diverge.
    console.warn(`⚠ present on one side only, not compared: ${[...uncomparable].sort().join(', ')}`);
  }

  if (mismatches.length) {
    console.error(`\n✗ ${mismatches.length} mismatch(es) — the number a trainer sees is not the number that gets stored:\n`);
    for (const m of mismatches.slice(0, 25)) console.error(m);
    if (mismatches.length > 25) console.error(`  … and ${mismatches.length - 25} more`);
    process.exit(1);
  }

  console.info('✓ the two copies agree on every compared input');
}

main();
