/**
 * The form platform's ratchet — §23.
 *
 * The migration is phased and will be unfinished for a while. That is fine.
 * What is not fine is it going backwards between phases, or a new screen
 * landing with another nine unjustified controls because the platform was not
 * the obvious path.
 *
 * Two kinds of threshold live here, and the difference matters:
 *
 *   CEILINGS  may only fall. Raising one is the regression this file exists to
 *             catch, and "we had to" has never once been true — every new form
 *             has the platform available to it.
 *   FLOORS    may only rise.
 *
 * `riskyCoercions` is set to 0, which is a ceiling that cannot be loosened
 * without deleting the assertion. That is deliberate: `Number('')` becoming a
 * business value is the defect class this whole platform was built to remove,
 * and it is now genuinely absent from the tree.
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

interface AuditRow {
  file: string;
  risk: 'P0' | 'P1' | 'P2';
  controls: number;
  nativeBusiness: number;
  unjustified: number;
  platformControls: number;
  isForm: boolean;
  contracts: Record<string, 'platform' | 'manual' | 'none'> | null;
  coercions: number;
  boundedCoercions: number;
  stateCoercions: number;
  unjustifiedStateCoercions: number;
  riskyLines: number[];
  stateLines: number[];
  uploadInputs: number;
  uploadCanonical: boolean;
  justification: string | null;
}

interface Audit {
  totals: {
    files: number;
    controls: number;
    nativeBusiness: number;
    unjustified: number;
    platformControls: number;
    coercions: number;
    boundedCoercions: number;
    stateCoercions: number;
    unjustifiedStateCoercions: number;
    uploadInputs: number;
    uploadUncanonical: number;
    forms: number;
    byRisk: Record<string, { unjustified: number; coercions: number; forms: number }>;
    contracts: Record<string, { platform: number; manual: number; none: number }>;
    staleJustifications: string[];
  };
  rows: AuditRow[];
}

/**
 * Run the real audit rather than re-implementing its counting.
 *
 * Two implementations of "what is a control" would drift, and the one in the
 * test would be the one nobody notices is wrong. `maxBuffer` is raised because
 * the JSON is ~74KB and the default 1MB is fine, but the default would silently
 * truncate if the tree grew — and a truncated read would fail as a parse error
 * rather than as a wrong number, which is the safe direction.
 */
function audit(): Audit {
  const script = join(process.cwd(), 'scripts', 'form-audit', 'index.mjs');
  const out = execFileSync(process.execPath, [script, '--json'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out) as Audit;
}

/** Lower these as phases land. Never raise them. */
const CEILING = {
  /** §6. Zero, and it stays zero. */
  riskyCoercions: 0,
  unjustified: 158,
  p0Unjustified: 0,
  p1Unjustified: 76,
  /**
   * §9. Zero, and it stays zero.
   *
   * Every upload site in the app reads the file's leading BYTES against the
   * canonical rule sets. `accept` and `File.type` are both derived from the
   * extension and prove nothing; this is the one check a renamed file cannot
   * talk its way out of — client-side, so the server repeats it.
   */
  uploadUncanonical: 0,
  /** Forms with no submit guard of any kind. */
  noSubmitContract: 15,
};

/** Raise these as phases land. Never lower them. */
const FLOOR = {
  platformControls: 311,
  /** Forms whose errors reach the canonical mapper. */
  errorPlatform: 53,
  /** Forms bound to a named canonical schema. */
  schemaPlatform: 22,
};

describe('the audit measures the tree', () => {
  const a = audit();

  it('runs and sees a populated tree', () => {
    // Guards the ratchet itself: a script that silently returned nothing would
    // make every assertion below pass while measuring air.
    //
    // Deliberately slack, and it gets slacker as the migration proceeds: the
    // total CONTROL count falls every time a screen moves to the design system,
    // because a wrapper's own native element is not counted. Pinning it near
    // the current number would fail a test the migration is improving. All this
    // has to prove is that the script read the tree at all.
    expect(a.totals.files).toBeGreaterThan(100);
    expect(a.rows.length).toBe(a.totals.files);
    expect(a.totals.controls).toBeGreaterThan(150);
    expect(a.totals.platformControls).toBeGreaterThan(150);
  });

  it('emits complete JSON', () => {
    // The first version called process.exit() straight after writing to a
    // pipe, which truncated the output at 64KB and made this test fail on a
    // parse error. If that regresses, the shape check catches it.
    expect(a.totals.byRisk.P0).toBeDefined();
    expect(a.rows.every((r) => typeof r.file === 'string')).toBe(true);
  });

  it('excludes the design system from control counting', () => {
    // Every wrapper bottoms out in a native element; counting those made the
    // old headline RISE when a field component was added.
    expect(a.rows.some((r) => r.file.includes('components/ui/form/') && r.controls > 0))
      .toBe(false);
    // The public surface's skin over the same wiring contract, excluded for the
    // same reason and no other.
    expect(a.rows.some((r) => r.file.includes('landing/SoftField') && r.controls > 0))
      .toBe(false);
  });
});

describe('ceilings — these may only fall', () => {
  const a = audit();

  it('every submit-time state coercion is accounted for', () => {
    // The OTHER place the blank-becomes-zero defect lives, and the one this
    // audit was blind to until it was pointed at a payload builder:
    //
    //     final_amount: Number(form.finalAmount),   // '' → 0
    //
    // Not a defect on sight — `Number(form.duration)` on a <select> of
    // '1'..'12' cannot go wrong — so each survivor is named in
    // justifications.mjs with what establishes that, and a reader can check it.
    const offenders = a.rows
      .filter((r) => r.unjustifiedStateCoercions > 0)
      .map((r) => `${r.file}:${r.stateLines.join(',')}`);
    expect(offenders, 'every Number(form.x) needs a guard or a justification').toEqual([]);
  });

  it('no risky numeric coercion anywhere in the tree', () => {
    // `Number(e.target.value)` on a control the user can CLEAR. The defect
    // class the platform exists to remove: a cleared price became ₹0, a
    // cleared commission became 0%, a blank GST became 0% on every invoice.
    //
    // Sliders and selects are counted separately — the browser guarantees they
    // have a value, so the coercion has nothing to coerce wrongly.
    const offenders = a.rows
      .filter((r) => r.coercions > 0)
      .map((r) => `${r.file}:${r.riskyLines.join(',')}`);
    expect(offenders, 'risky coercions must stay at zero').toEqual([]);
    expect(a.totals.coercions).toBe(CEILING.riskyCoercions);
  });

  it('unjustified native business controls never increase', () => {
    expect(a.totals.unjustified).toBeLessThanOrEqual(CEILING.unjustified);
  });

  it('P0 has no unjustified native business control at all', () => {
    // The ones that decide money and access. This reached ZERO, so it is an
    // invariant rather than a ceiling: every native control left on a P0 screen
    // is named in justifications.mjs with a reason a person wrote and a reader
    // can check against the file. A new one fails here by name.
    const offenders = a.rows
      .filter((r) => r.risk === 'P0' && r.unjustified > 0)
      .map((r) => `${r.file} (${r.unjustified})`);
    expect(offenders).toEqual([]);
    expect(a.totals.byRisk.P0!.unjustified).toBe(CEILING.p0Unjustified);
  });

  it('P1 unjustified never increases', () => {
    expect(a.totals.byRisk.P1!.unjustified).toBeLessThanOrEqual(CEILING.p1Unjustified);
  });

  it('every upload site reaches the canonical validator', () => {
    // An invariant rather than a ceiling: this reached zero, so a new upload
    // that skips the byte check fails here by name.
    const raw = a.rows
      .filter((r) => r.uploadInputs > 0 && !r.uploadCanonical)
      .map((r) => r.file);
    expect(raw).toEqual([]);
    expect(a.totals.uploadUncanonical).toBe(CEILING.uploadUncanonical);
    // And the sites still exist — a check that passes because the feature was
    // deleted is not the same as one that passes because it was fixed.
    expect(a.totals.uploadInputs).toBeGreaterThan(5);
  });

  it('forms with no submit guard never increase', () => {
    expect(a.totals.contracts.submit!.none).toBeLessThanOrEqual(CEILING.noSubmitContract);
  });
});

describe('floors — these may only rise', () => {
  const a = audit();

  it('design-system control usage never decreases', () => {
    expect(a.totals.platformControls).toBeGreaterThanOrEqual(FLOOR.platformControls);
  });

  it('canonical error mapping never decreases', () => {
    expect(a.totals.contracts.error!.platform).toBeGreaterThanOrEqual(FLOOR.errorPlatform);
  });

  it('canonical schema binding never decreases', () => {
    expect(a.totals.contracts.schema!.platform).toBeGreaterThanOrEqual(FLOOR.schemaPlatform);
  });
});

describe('the ratchet stays honest', () => {
  const a = audit();

  it('no justification is stale, in either direction', () => {
    // Two shapes. An exemption for a file that no longer has native business
    // controls is an empty slot a regression can occupy unnoticed; an
    // exemption that allows MORE than the file has is the same thing with the
    // slack hidden inside a live entry. verify-payments sat at allow: 8 with 6
    // real controls once two of its boxes were reclassified as search.
    expect(a.totals.staleJustifications).toEqual([]);
  });

  it('every justification carries a reason of substance', () => {
    // A one-word reason is not a justification. The registry's own rules say a
    // justification is a technical claim about the code, checkable by reading it.
    const justified = a.rows.filter((r) => r.justification !== null);
    expect(justified.length).toBeGreaterThan(0);
    for (const r of justified) {
      expect(r.justification!.length, `${r.file} needs a real reason`).toBeGreaterThan(120);
    }
  });

  it('ceilings are not left stale after a phase lands', () => {
    // A ceiling far above the real count is a ratchet that has stopped
    // ratcheting. 20 is slack enough for one in-flight phase and tight enough
    // to force an update when one lands.
    expect(CEILING.unjustified - a.totals.unjustified).toBeLessThan(20);
  });

  it('the two migrated forms are still on the platform', () => {
    const offers = a.rows.find((r) => r.file.includes('OfferForm'));
    expect(offers?.contracts?.schema).toBe('platform');
    expect(offers?.nativeBusiness).toBe(0);

    const commissions = a.rows.find((r) => r.file.includes('commissions/page'));
    expect(commissions?.contracts?.schema).toBe('platform');
  });
});
