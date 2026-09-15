// The scoring library exists twice, and this is what notices when the copies drift.
//
// ── The duplicate ─────────────────────────────────────────────────────────
//
//   frontend  src/lib/fitness-calculations.ts
//   backend   src/modules/progress/fitness-scoring.js
//   frontend  src/lib/lifestyle-calculations.ts
//   backend   src/modules/progress/lifestyle-scoring.js
//
// Same function names, same line numbers to within two or three, maintained by
// hand in parallel across two repos that cannot import each other. The frontend
// copy runs live in the assessment wizard — a trainer watches a score change as
// they type — and the backend copy recomputes on POST and is what actually gets
// stored. They are the trainer's number and the client's record.
//
// Measured when this was written: 18,527 fitness calls across 23 shared
// functions and 7,238 lifestyle calls across 11, zero mismatches.
//
// Lifestyle was added after fitness, and it did not start green. classifyActivity
// guarded an unrecognised steps bracket on the backend and not on the frontend,
// where the score became NaN — which survives mean()'s `!= null` filter, so the
// whole composite went NaN and the readiness band fell through to "High Risk"
// for a healthy client. The wizard casts `row.daily_steps_bracket` out of the
// API with no validation, so that was reachable with a legacy value.
//
// goal, mobility, nutrition and posture followed, and all four WERE already in
// parity — which is worth stating, because "we checked and it was fine" and "we
// never checked" look identical from the outside and are not the same claim.
// All six are covered now: 31,243 calls, zero mismatches.
//
// ── Why these tests, and not the comparison itself ────────────────────────
//
// The comparison needs both repos checked out, which only happens in the E2E
// job. So the comparison lives in scripts/assert-scoring-parity.ts and these
// tests pin the thing that can quietly rot instead: whether it is still wired
// into CI, and whether it still refuses to pass when it cannot compare.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const script = readFileSync(join(ROOT, 'scripts', 'assert-scoring-parity.ts'), 'utf8');
const workflow = readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');

describe('the parity check is wired into CI', () => {
  it('runs as a step in the job that checks out both repos', () => {
    expect(workflow).toContain('scripts/assert-scoring-parity.ts');
  });

  it('runs in the e2e job, which is the only place the backend exists', () => {
    // Anchored to the dual checkout rather than to a job name: if the backend
    // checkout ever moves, this should fail rather than keep asserting against
    // a job that no longer has the thing being compared.
    const e2e = workflow.slice(workflow.indexOf('repository: abhishek21lift-oss/619-erp-backend'));
    expect(e2e).toContain('assert-scoring-parity.ts');
  });

  it('never sets the opt-out in CI', () => {
    // SCORING_PARITY_OPTIONAL downgrades a missing backend to a warning. In CI
    // both repos are present, so a skip would mean the check is broken rather
    // than satisfied — and a green tick for the one configuration where drift
    // goes unnoticed is worse than no check.
    const line = workflow.split('\n').find((l) => l.includes('assert-scoring-parity.ts'));
    expect(line).toBeDefined();
    expect(workflow).not.toMatch(/SCORING_PARITY_OPTIONAL:\s*'?1/);
  });
});

describe('the parity check cannot pass without comparing anything', () => {
  it('exits non-zero when the backend is missing', () => {
    expect(script).toMatch(/process\.exit\(1\)/);
    expect(script).toContain('A parity check that cannot compare anything must not report green.');
  });

  it('refuses a suspiciously small comparison rather than reporting green', () => {
    // If exports are renamed on one side or an input grid collapses, the count
    // drops and the check would otherwise pass having proven nothing. Each
    // suite carries its own floor, so a collapse in one cannot hide behind the
    // other's volume.
    expect(script).toMatch(/compared < suite\.minCalls/);
    expect(script).toMatch(/minCalls:\s*10000/);   // fitness
    expect(script).toMatch(/minCalls:\s*1000/);    // lifestyle, goal, nutrition
    expect(script).toMatch(/minCalls:\s*200/);     // mobility, posture
  });

  it('covers all six duplicated scoring libraries', () => {
    // The pairs are hand-maintained across two repos that cannot import each
    // other, so a library that is not named here is one nothing compares.
    for (const suite of ['fitness', 'lifestyle', 'goal', 'mobility', 'nutrition', 'posture']) {
      expect(script).toContain(`name: '${suite}'`);
    }
  });

  it('compares every suite, not just the first', () => {
    // flatMap over the resolved suites: a `return` after the first would make
    // the second silently uncompared while still printing a tick.
    expect(script).toMatch(/resolved\.flatMap/);
  });

  it('names functions that exist on only one side instead of dropping them', () => {
    // How two hand-maintained copies begin to diverge: one grows a function.
    expect(script).toContain('present on one side only, not compared');
  });

  it('treats a thrown error as an outcome, not as a skip', () => {
    // One side throwing where the other returns null is drift the trainer sees
    // as a crashed wizard.
    expect(script).toMatch(/THREW:/);
  });

  it('compares as JSON so null and undefined cannot read as equal', () => {
    expect(script).toMatch(/JSON\.stringify\(v === undefined \? null : v\)/);
  });
});

describe('both copies still exist where the check expects them', () => {
  it('the frontend copies are where the script imports them from', () => {
    for (const lib of ['fitness', 'lifestyle', 'goal', 'mobility', 'nutrition', 'posture']) {
      expect(() => readFileSync(join(ROOT, 'src', 'lib', `${lib}-calculations.ts`), 'utf8')).not.toThrow();
    }
  });

  it('names every backend module, so a moved file is reported precisely', () => {
    for (const lib of ['fitness', 'lifestyle', 'goal', 'mobility', 'nutrition', 'posture']) {
      expect(script).toContain(`src/modules/progress/${lib}-scoring.js`);
    }
  });

  it('the script looks for the backend in the layouts that actually occur', () => {
    expect(script).toContain('../backend');           // the E2E job
    expect(script).toContain('../619-erp-backend');   // a side-by-side clone
    expect(script).toContain('BACKEND_PATH');         // explicit override
  });
});
