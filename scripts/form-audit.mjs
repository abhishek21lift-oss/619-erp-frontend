#!/usr/bin/env node
/**
 * The form audit — §16 and §24.
 *
 * Counts what is actually in the tree rather than what anyone remembers being
 * there, and classifies every file that renders a control by how much damage a
 * bad value in it can do.
 *
 * Written as a script rather than a paragraph in a report because §24 asks for
 * a SECOND independent audit after the work, and an audit you cannot re-run is
 * a claim rather than a measurement. `node scripts/form-audit.mjs` reproduces
 * every number quoted in the migration's commit messages.
 *
 * `--json` emits the raw shape for a test to assert against; the ratchet test
 * uses it so the raw-control count can only fall.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/* ── What counts as a control ──────────────────────────────────────────────
 *
 * Matched on the opening tag, over source with comments removed. The comment
 * stripping is not fastidiousness: the first run of this script counted two
 * controls in a file that has none, because its header comment says "the raw
 * `<input>`/`<select>` set is gone". A migration note about inputs would
 * otherwise register as inputs, and the better the note the worse the count.
 *
 * Self-evidently approximate — this is a ratchet and a map, not a compiler.
 */
const RAW_CONTROL = /<(input|textarea|select)[\s/>]/g;

/**
 * Remove comments so prose about controls is not counted as controls.
 *
 * Block comments (which covers JSX `{/* … *\/}`) and whole-line `//` comments.
 * Trailing `//` is deliberately left alone: telling it apart from the `//` in a
 * URL needs a real parser, and a trailing comment mentioning `<input` is rare
 * enough to accept against the risk of mangling a string literal.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Components that carry the platform's wiring. Rendering one is "migrated". */
const PLATFORM_CONTROL =
  /<(TextField|TextAreaField|NumberField|SelectField|DateFieldControl|CheckboxField|SearchField|TextFieldRow|FormField|FloatInput)[\s/>]/g;

/** Anything that submits. Used to count forms rather than fields. */
const FORM_MARKER = /<form[\s>]|useAppForm\(|handleSubmit|onSubmit=/g;

/**
 * Risk classification — §16.
 *
 * P0 is not "important", it is "a wrong value here costs money, leaks data or
 * corrupts a record that other records are derived from". The distinction
 * matters because it decides migration order, and ordering by how busy a
 * screen looks would put the exercise library ahead of payments.
 */
const P0 = [
  /finance\//, /payments?\//, /invoice/i, /billing/i, /commission/i,
  /coupon/i, /offers?\//, /subscription/i, /razorpay/i, /payout/i,
  /platform-login/, /\/login/, /auth/i, /password/i, /permissions?/,
];

const P1 = [
  /assessment/i, /parq/i, /consent/i, /pt-os\//, /clients?\//, /trainers?\//,
  /programme/i, /program/i, /workout/i, /diet/i, /nutrition/i, /attendance/i,
  /leave/i, /member/i, /enroll?ment/i, /ai\//, /whatsapp/i, /engagement\//,
  /automation/i, /campaign/i,
];

const P3 = [/filter/i, /search/i, /Search[A-Z]/, /tab/i, /sort/i];

function classify(rel, source) {
  for (const p of P0) if (p.test(rel)) return 'P0';
  for (const p of P1) if (p.test(rel)) return 'P1';
  // A file whose only controls are search/filter boxes is P3 wherever it lives.
  const raw = (source.match(RAW_CONTROL) ?? []).length;
  const searchy = (source.match(/type="search"|placeholder="Search|<SearchField/g) ?? []).length;
  if (raw > 0 && searchy >= raw) return 'P3';
  for (const p of P3) if (p.test(rel)) return 'P3';
  return 'P2';
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, out);
    } else if (/\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC);
const rows = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const source = stripComments(readFileSync(file, 'utf8'));

  const raw = (source.match(RAW_CONTROL) ?? []).length;
  const platform = (source.match(PLATFORM_CONTROL) ?? []).length;
  if (raw === 0 && platform === 0) continue;

  const forms = new Set(source.match(FORM_MARKER) ?? []).size > 0
    ? (source.match(/<form[\s>]|useAppForm\(/g) ?? []).length || 1
    : 0;

  rows.push({
    file: rel,
    raw,
    platform,
    forms,
    schema: /from '.*forms\/schemas|useAppForm\(/.test(source),
    priority: classify(rel, source),
  });
}

const totals = {
  filesWithControls: rows.length,
  rawControls: rows.reduce((s, r) => s + r.raw, 0),
  platformControls: rows.reduce((s, r) => s + r.platform, 0),
  formsOnPlatform: rows.filter((r) => r.schema).length,
  byPriority: {},
};

for (const p of ['P0', 'P1', 'P2', 'P3']) {
  const set = rows.filter((r) => r.priority === p);
  totals.byPriority[p] = {
    files: set.length,
    raw: set.reduce((s, r) => s + r.raw, 0),
    platform: set.reduce((s, r) => s + r.platform, 0),
    onPlatform: set.filter((r) => r.schema).length,
  };
}

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ totals, rows }, null, 2));
  process.exit(0);
}

const pct = (n, d) => (d === 0 ? '—' : `${Math.round((n / d) * 100)}%`);

console.log('\n── MY PT STUDIO — form audit ──────────────────────────────────\n');
console.log(`Files rendering a control      ${totals.filesWithControls}`);
console.log(`Raw <input|textarea|select>    ${totals.rawControls}`);
console.log(`Design-system controls         ${totals.platformControls}`);
console.log(`Forms on the schema platform   ${totals.formsOnPlatform}`);
console.log(
  `Share of controls migrated     ${pct(
    totals.platformControls,
    totals.platformControls + totals.rawControls,
  )}\n`,
);

console.log('By risk class:');
console.log('  class  files   raw  design-sys  on-platform');
for (const p of ['P0', 'P1', 'P2', 'P3']) {
  const b = totals.byPriority[p];
  console.log(
    `  ${p}     ${String(b.files).padStart(4)}  ${String(b.raw).padStart(4)}  ` +
      `${String(b.platform).padStart(10)}  ${String(b.onPlatform).padStart(11)}`,
  );
}

console.log('\nP0 files still holding raw controls (migrate first):');
const p0raw = rows
  .filter((r) => r.priority === 'P0' && r.raw > 0)
  .sort((a, b) => b.raw - a.raw);
if (p0raw.length === 0) {
  console.log('  none');
} else {
  for (const r of p0raw) {
    console.log(`  ${String(r.raw).padStart(3)}  ${r.file}${r.schema ? '  (partly migrated)' : ''}`);
  }
}
console.log('');
