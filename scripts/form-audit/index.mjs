#!/usr/bin/env node
/**
 * The form audit — §22.
 *
 * `node scripts/form-audit/index.mjs` reproduces every number quoted in this
 * migration's commits and PRs. `--json` feeds the ratchet test.
 *
 * It reports, per file and in total:
 *
 *   · controls split by kind, and by whether the kind is legitimately native
 *   · which of the four contracts each form has — submit, error, reset, schema
 *     — and whether it has them via the platform or its own equivalent
 *   · numeric coercions of a control's value (the blank-becomes-zero class)
 *   · upload sites that do not reach the canonical validator
 *   · native business controls that are NOT justified in justifications.mjs
 *
 * The last line is the one §1 actually asks for. "Zero raw controls" is a bad
 * target — it would have this migration rewriting search boxes and file
 * pickers — so the target is zero UNJUSTIFIED native controls in business
 * forms, and every survivor is named with a reason a person wrote.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  controlKind, controlTags, NATIVE_BY_KIND, BUSINESS_KINDS,
  contractCoverage, looksLikeForm, riskOf, coercionSites, uploadSites, wheelHazards,
} from './classify.mjs';
import { JUSTIFIED, justificationFor } from './justifications.mjs';
import { JOURNEYS, coveredFiles } from './journeys.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'src');

/**
 * The design system's own files.
 *
 * Excluded from control counting because every wrapper bottoms out in a native
 * element — `RadioField` contains `<input type="radio">` and must. Counting
 * those made the old headline RISE when a field component was added.
 *
 * `SoftField.tsx` is here for the same reason and no other: it is the public
 * surface's skin over the SAME wiring contract (it calls FormField's own
 * `useFieldWiringState` and `fieldControlProps`), not a second field system.
 * See its header for why the signed-out pages cannot use the chrome controls.
 */
const DESIGN_SYSTEM = [
  'src/components/ui/form',
  'src/components/landing/SoftField.tsx',
];

/** Comments are prose; the first audit counted its own documentation. */
const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

const rows = [];

for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const raw = readFileSync(file, 'utf8');
  const source = stripComments(raw);
  const inDesignSystem = DESIGN_SYSTEM.some((d) => rel.startsWith(d));

  const kinds = {};
  let nativeBusiness = 0;
  if (!inDesignSystem) {
    for (const { tag, attrs } of controlTags(source)) {
      const kind = controlKind(tag, attrs);
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      if (BUSINESS_KINDS.has(kind) && !NATIVE_BY_KIND.has(kind)) nativeBusiness += 1;
    }
  }

  const platformControls =
    (source.match(
      /<(TextField|TextAreaField|NumberField|SelectField|DateFieldControl|MonthFieldControl|CheckboxField|RadioField|SearchField|TextFieldRow|FormField|FloatInput|SoftTextField|SoftField|SoftInput)[\s/>]/g,
    ) ?? []).length;

  const total = Object.values(kinds).reduce((a, b) => a + b, 0);
  if (total === 0 && platformControls === 0) continue;

  const coercion = coercionSites(source);
  const uploads = uploadSites(source);
  const wheels = wheelHazards(source);
  const isForm = looksLikeForm(source, nativeBusiness > 0 || platformControls > 0);
  const contracts = isForm ? contractCoverage(source) : null;
  const justification = justificationFor(rel);

  rows.push({
    file: rel,
    risk: riskOf(rel),
    kinds,
    controls: total,
    nativeBusiness,
    platformControls,
    isForm,
    contracts,
    coercions: coercion.risky,
    boundedCoercions: coercion.bounded,
    stateCoercions: coercion.state,
    riskyLines: coercion.riskyLines,
    stateLines: coercion.stateLines,
    wheelHazards: wheels,
    uploadInputs: uploads.inputs,
    uploadCanonical: uploads.canonical,
    justified: justification ? justification.allow : 0,
    justification: justification?.reason ?? null,
    /** Native business controls with no justification covering them. */
    unjustified: Math.max(0, nativeBusiness - (justification?.allow ?? 0)),
    /**
     * Submit-time coercions with no justification covering them.
     *
     * Separate allowance from `allow`, because they are different claims: one
     * says "this control is fine as a native element", the other says "this
     * `Number(form.x)` runs on a value something else has already checked".
     */
    unjustifiedStateCoercions: Math.max(
      0, coercion.state - (justification?.allowStateCoercions ?? 0),
    ),
  });
}

/* ── Totals ─────────────────────────────────────────────────────────────── */

const byRisk = (r) => rows.filter((x) => x.risk === r);
const sum = (xs, k) => xs.reduce((a, x) => a + x[k], 0);

const totals = {
  files: rows.length,
  controls: sum(rows, 'controls'),
  nativeBusiness: sum(rows, 'nativeBusiness'),
  unjustified: sum(rows, 'unjustified'),
  platformControls: sum(rows, 'platformControls'),
  coercions: sum(rows, 'coercions'),
  boundedCoercions: sum(rows, 'boundedCoercions'),
  stateCoercions: sum(rows, 'stateCoercions'),
  unjustifiedStateCoercions: sum(rows, 'unjustifiedStateCoercions'),
  wheelHazards: sum(rows, 'wheelHazards'),
  uploadInputs: sum(rows, 'uploadInputs'),
  uploadUncanonical: rows.filter((r) => r.uploadInputs > 0 && !r.uploadCanonical).length,
  forms: rows.filter((r) => r.isForm).length,
  byRisk: {},
  contracts: { submit: {}, error: {}, reset: {}, schema: {} },
  journeys: {},
};

/*
 * ── End-to-end coverage ──────────────────────────────────────────────────
 *
 * Every other number above is read out of the source, and every one of them
 * can be satisfied by code that looks right and does not work: a form can
 * bind a canonical schema, map its errors and reset cleanly while posting a
 * field name the endpoint ignores. Only a journey that types into the real
 * form and reads the row back out of the real database closes that gap, so
 * it is measured here beside the rest.
 *
 * The pairing is declared in journeys.mjs, not inferred — an inferred
 * version would go green for a spec that merely mentions a URL. Both halves
 * are verified to exist, so a renamed page or a deleted spec fails the audit
 * loudly rather than quietly shrinking the denominator.
 */
{
  const covered = coveredFiles();
  const missingSpecs = Object.keys(JOURNEYS).filter(
    (spec) => !existsSync(join(ROOT, spec)),
  );
  const missingPages = [...covered].filter((f) => !existsSync(join(ROOT, f)));

  for (const r of rows) r.hasJourney = covered.has(r.file);

  // Critical = a P0 or P1 file that is actually a form. A journey for a P2
  // display page is welcome and is not what this number is about.
  const critical = rows.filter((r) => r.isForm && (r.risk === 'P0' || r.risk === 'P1'));
  const uncovered = critical.filter((r) => !r.hasJourney);

  totals.journeys = {
    specs: Object.keys(JOURNEYS).length,
    claimedFiles: covered.size,
    criticalForms: critical.length,
    criticalCovered: critical.length - uncovered.length,
    criticalWithoutJourney: uncovered.length,
    uncovered: uncovered.map((r) => `${r.risk}  ${r.file}`),
    // A broken pairing is worse than an absent one: it silently removes a
    // file from the denominator. Surfaced as its own number so the ratchet
    // can pin it at zero.
    brokenPairings: [...missingSpecs, ...missingPages],
  };
}

for (const r of ['P0', 'P1', 'P2']) {
  const set = byRisk(r);
  totals.byRisk[r] = {
    files: set.length,
    controls: sum(set, 'controls'),
    nativeBusiness: sum(set, 'nativeBusiness'),
    unjustified: sum(set, 'unjustified'),
    coercions: sum(set, 'coercions'),
    stateCoercions: sum(set, 'stateCoercions'),
    unjustifiedStateCoercions: sum(set, 'unjustifiedStateCoercions'),
    wheelHazards: sum(set, 'wheelHazards'),
    forms: set.filter((x) => x.isForm).length,
  };
}

for (const name of ['submit', 'error', 'reset', 'schema']) {
  for (const level of ['platform', 'manual', 'none']) {
    totals.contracts[name][level] = rows.filter(
      (r) => r.contracts && r.contracts[name] === level,
    ).length;
  }
}

/**
 * Justifications that have gone slack, either way.
 *
 * Two shapes, and the second is the one that nearly slipped through:
 *
 *   · the file no longer has native business controls at all, so the entry is
 *     an empty slot a regression can occupy unnoticed;
 *   · the entry allows MORE than the file actually has. `allow` is documented
 *     as a count and not a blanket, and an allowance above the real number is
 *     a blanket by another name — verify-payments sat at allow: 8 with 6 real
 *     controls once two of its boxes were correctly reclassified as search,
 *     leaving two free slots nobody had reasoned about.
 */
totals.staleJustifications = Object.keys(JUSTIFIED).flatMap((f) => {
  const row = rows.find((r) => r.file === f);
  const entry = JUSTIFIED[f];
  // An entry may exist for coercions alone, with no native controls to allow.
  if (!row) return [f];
  if (row.nativeBusiness === 0 && !entry.allowStateCoercions) return [f];
  const stale = [];
  const allow = JUSTIFIED[f].allow;
  if (allow > row.nativeBusiness) {
    stale.push(`${f} (allows ${allow} controls, file has ${row.nativeBusiness})`);
  }
  const allowCo = JUSTIFIED[f].allowStateCoercions ?? 0;
  if (allowCo > row.stateCoercions) {
    stale.push(`${f} (allows ${allowCo} state coercions, file has ${row.stateCoercions})`);
  }
  return stale;
});

if (process.argv.includes('--json')) {
  // No process.exit() here. stdout is a pipe when the ratchet test runs this,
  // and a pipe write is asynchronous — exiting immediately truncated the JSON
  // at 64KB, which the test then parsed as malformed. Letting the process end
  // naturally flushes it. (Found by the ratchet failing to parse its own
  // input, which is the right way round for a measuring tool to break.)
  process.stdout.write(JSON.stringify({ totals, rows }, null, 2));
} else {

/* ── Report ─────────────────────────────────────────────────────────────── */


const pad = (v, n) => String(v).padStart(n);
const pct = (n, d) => (d === 0 ? '  —' : `${pad(Math.round((n / d) * 100), 3)}%`);

console.log('\n── MY PT STUDIO — form platform audit ─────────────────────────\n');
console.log(`Files rendering a control        ${pad(totals.files, 5)}`);
console.log(`Controls (all kinds)             ${pad(totals.controls, 5)}`);
console.log(`  of which native business       ${pad(totals.nativeBusiness, 5)}`);
console.log(`  of which UNJUSTIFIED           ${pad(totals.unjustified, 5)}   ← §1's target is 0`);
console.log(`Design-system controls           ${pad(totals.platformControls, 5)}`);
console.log(`Forms (a <form> or a submit)     ${pad(totals.forms, 5)}`);
console.log(`Risky value coercions            ${pad(totals.coercions, 5)}   ← §6, a clearable input`);
console.log(`  bounded (range/select)         ${pad(totals.boundedCoercions, 5)}   browser guarantees a value`);
console.log(`Submit-time state coercions      ${pad(totals.stateCoercions, 5)}   ← Number(form.x), '' becomes 0`);
console.log(`  of which UNJUSTIFIED           ${pad(totals.unjustifiedStateCoercions, 5)}   no validator proven in front`);
console.log(`type="number" controls           ${pad(totals.wheelHazards, 5)}   ← a wheel over a focused field`);
console.log(`Upload sites                     ${pad(totals.uploadInputs, 5)}`);
console.log(`  files not using canonical rules${pad(totals.uploadUncanonical, 5)}   ← §12\n`);

console.log('Contract coverage, over the files that are forms:');
console.log('  contract   platform   own way   none');
for (const name of ['submit', 'error', 'reset', 'schema']) {
  const c = totals.contracts[name];
  console.log(
    `  ${name.padEnd(9)}  ${pad(c.platform, 8)}  ${pad(c.manual, 8)}  ${pad(c.none, 5)}` +
      `   (${pct(c.platform + c.manual, totals.forms)} covered)`,
  );
}

const j = totals.journeys;
console.log('\nEnd-to-end coverage, over the P0/P1 files that are forms:');
console.log(
  `  ${pad(j.criticalCovered, 3)} of ${j.criticalForms} covered by a real browser journey` +
    `   (${pct(j.criticalCovered, j.criticalForms)})`,
);
console.log(`  ${pad(j.criticalWithoutJourney, 3)} with no journey   \u2190 \u00a76`);
if (j.brokenPairings.length) {
  console.log(`  ${pad(j.brokenPairings.length, 3)} BROKEN pairings in journeys.mjs:`);
  for (const f of j.brokenPairings) console.log(`        ${f}`);
}

console.log('\nBy risk:');
console.log('  class  files  forms  controls  native-biz  unjustified  coercions');
for (const r of ['P0', 'P1', 'P2']) {
  const b = totals.byRisk[r];
  console.log(
    `  ${r}    ${pad(b.files, 5)}  ${pad(b.forms, 5)}  ${pad(b.controls, 8)}  ` +
      `${pad(b.nativeBusiness, 10)}  ${pad(b.unjustified, 11)}  ${pad(b.coercions, 9)}`,
  );
}

const worst = rows
  .filter((r) => r.unjustified > 0)
  .sort((a, b) => (a.risk === b.risk ? b.unjustified - a.unjustified : a.risk < b.risk ? -1 : 1));

console.log(`\nUnjustified native business controls (${worst.length} files):`);
if (worst.length === 0) console.log('  none');
for (const r of worst.slice(0, 30)) {
  const marks = [
    r.coercions ? `${r.coercions} coercion${r.coercions > 1 ? 's' : ''}` : null,
    r.contracts && r.contracts.schema === 'none' ? 'no schema' : null,
    r.contracts && r.contracts.submit === 'none' ? 'no submit guard' : null,
  ].filter(Boolean);
  console.log(
    `  ${r.risk}  ${pad(r.unjustified, 3)}  ${r.file}${marks.length ? `   [${marks.join(', ')}]` : ''}`,
  );
}
if (worst.length > 30) console.log(`  … and ${worst.length - 30} more`);

if (totals.staleJustifications.length) {
  console.log('\nStale justifications — the file no longer has native business controls:');
  for (const f of totals.staleJustifications) console.log(`  ${f}`);
}
console.log('');
}
