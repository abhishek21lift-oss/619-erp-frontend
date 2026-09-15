/**
 * The form platform's ratchet.
 *
 * The migration is phased and will be unfinished for a while. That is fine; what
 * is not fine is it going backwards between phases, or a new screen landing with
 * another nine raw inputs because the platform was not obvious.
 *
 * So the audit's counts are pinned here and may only move in one direction. Same
 * device as `silent-catch-ratchet` and the backend's SQL-in-adapter budgets, and
 * chosen for the same reason: a number that can only fall turns "we mean to
 * migrate that" into something a build can check.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

interface AuditRow {
  file: string;
  raw: number;
  platform: number;
  schema: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

interface Audit {
  totals: {
    filesWithControls: number;
    rawControls: number;
    platformControls: number;
    formsOnPlatform: number;
    byPriority: Record<string, { files: number; raw: number; platform: number; onPlatform: number }>;
  };
  rows: AuditRow[];
}

/**
 * Run the real audit script rather than re-implementing its counting.
 *
 * Two implementations of "what is a control" would drift, and the one in the
 * test would be the one nobody notices is wrong.
 */
function audit(): Audit {
  const script = join(process.cwd(), 'scripts', 'form-audit.mjs');
  const out = execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' });
  return JSON.parse(out) as Audit;
}

/**
 * Where the tree stands today.
 *
 * Lower these as phases land. Never raise them: a raise is the regression this
 * file exists to catch, and "we had to" has never once been true — a new form
 * has the platform available to it.
 */
const CEILING = {
  rawControls: 366,
  p0RawControls: 65,
};

/** Migration progress may only increase. */
const FLOOR = {
  platformControls: 204,
  formsOnPlatform: 1,
};

describe('the form platform ratchet', () => {
  const a = audit();

  it('the audit script still runs and sees the tree', () => {
    // Guards the ratchet itself: a script that silently returns zero rows would
    // make every assertion below pass while measuring nothing.
    expect(a.totals.filesWithControls).toBeGreaterThan(100);
    expect(a.rows.length).toBe(a.totals.filesWithControls);
  });

  it('raw controls never increase', () => {
    expect(a.totals.rawControls).toBeLessThanOrEqual(CEILING.rawControls);
  });

  it('raw controls in P0 files never increase', () => {
    // The ones that decide money and access. Weighted separately because a
    // healthy total could hide a new payment form.
    expect(a.totals.byPriority.P0!.raw).toBeLessThanOrEqual(CEILING.p0RawControls);
  });

  it('design-system control usage never decreases', () => {
    expect(a.totals.platformControls).toBeGreaterThanOrEqual(FLOOR.platformControls);
  });

  it('forms on the schema platform never decrease', () => {
    expect(a.totals.formsOnPlatform).toBeGreaterThanOrEqual(FLOOR.formsOnPlatform);
  });

  it('the ceiling is not left stale after a phase lands', () => {
    // A ceiling well above the real count is a ratchet that has stopped
    // ratcheting — it would let a regression back in unnoticed. 25 is slack
    // enough for one in-flight phase and tight enough to force an update.
    expect(CEILING.rawControls - a.totals.rawControls).toBeLessThan(25);
  });

  it('the offers form is on the platform', () => {
    // The first migration, and the worked example the rest are measured
    // against. If this stops being true the platform has been backed out.
    const offers = a.rows.find((r) => r.file.includes('OfferForm'));
    expect(offers, 'OfferForm.tsx should be in the audit').toBeDefined();
    expect(offers!.schema).toBe(true);
    expect(offers!.raw).toBe(0);
  });
});
