#!/usr/bin/env node
// Every /api path this frontend calls must be a route the backend serves.
//
// ── Why this exists ────────────────────────────────────────────────────────
//
// Two repositories, one contract, and nothing checking it. tsc proves the
// frontend's own calls typecheck; it cannot know whether the URL inside them
// is served. So a whole feature shipped against endpoints that were never
// built: /ai/intelligence called nineteen methods under /api/ai/trainer,
// /api/ai/memory and /api/ai/programmer, none of which existed in any form —
// not renamed, not flagged off, absent. Its own test asserted
// `typeof api.ai.memory.list === 'function'` and passed throughout.
// /api/pt-os/clients/:id/checkin-insight was a twentieth.
//
// This is the check that would have caught all twenty on the commit that
// introduced them.
//
// ── How it reads the two sides ─────────────────────────────────────────────
//
// Backend: walk server.js for `app.use('/api/...', require('./routes/x'))`,
// then follow each router's own `router.use()` mounts recursively, so a path
// assembled across three files is still resolved to what Express will actually
// match.
//
// Frontend: every '/api/...' string or template literal under src/, with
// `${...}` collapsed to a wildcard segment so a call site is compared against
// a route pattern rather than against one particular id.
//
// ── Usage ──────────────────────────────────────────────────────────────────
//
//   node scripts/api-contract-check.mjs [--backend ../619-erp-backend]
//
// Exits 0 when every call resolves, 1 when any does not, and 0 with a notice
// when the backend checkout is not beside this one — CI that has only this
// repo should not fail, but CI that has both must.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FE_SRC = path.join(HERE, '..', 'src');

const argIdx = process.argv.indexOf('--backend');
const BE_ROOT = path.resolve(
  argIdx !== -1 && process.argv[argIdx + 1]
    ? process.argv[argIdx + 1]
    : process.env.BACKEND_PATH ?? path.join(HERE, '..', '..', '619-erp-backend'),
);

const serverJs = path.join(BE_ROOT, 'src', 'server.js');
if (!fs.existsSync(serverJs)) {
  // FAIL, not skip.
  //
  // A contract check that exits 0 when it cannot compare anything reports
  // green for the exact configuration where drift goes unnoticed — and this
  // check exists because twenty endpoints shipped behind a nav entry against
  // routes that did not exist. A missing checkout is the state in which that
  // happens again, so it is a failure, and the message says how to fix it.
  //
  // CONTRACT_CHECK_OPTIONAL=1 downgrades it to a warning for a local clone
  // that genuinely has only this repo. CI must never set it; the frontend's
  // e2e job checks out the backend precisely so this can run, and a wiring
  // test asserts the opt-out is absent from the workflow.
  const message = `[api-contract] backend not found at ${BE_ROOT}`;
  if (process.env.CONTRACT_CHECK_OPTIONAL === '1') {
    console.warn(`⚠ ${message} — skipped because CONTRACT_CHECK_OPTIONAL=1`);
    process.exit(0);
  }
  console.error(`✗ ${message}`);
  console.error('  A contract check that cannot compare anything must not report green.');
  console.error('  Pass --backend <path>, set BACKEND_PATH, or clone the backend beside this repo.');
  process.exit(1);
}

// ── Backend: the routes Express will actually match ────────────────────────

const resolveFrom = (fromFile, rel) => {
  const base = path.resolve(path.dirname(fromFile), rel);
  for (const c of [base, `${base}.js`, path.join(base, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
};

const routes = [];

function collectRouter(file, prefix, seen) {
  const key = `${file}|${prefix}`;
  if (seen.has(key)) return;
  seen.add(key);
  const src = fs.readFileSync(file, 'utf8');

  for (const r of src.matchAll(/router\.(get|post|put|patch|delete|all)\(\s*(['"`])([^'"`]*)\2/g)) {
    const sub = r[3];
    routes.push({
      method: r[1].toUpperCase(),
      path: (prefix.replace(/\/$/, '') + (sub === '/' ? '' : sub)) || '/',
    });
  }

  // Nested mounts, with or without a path of their own.
  for (const u of src.matchAll(/router\.use\(([^\n]*)/g)) {
    const rest = u[1];
    const withPath = rest.match(/^\s*(['"`])([^'"`]*)\1/);
    const childPrefix = prefix.replace(/\/$/, '') + (withPath ? withPath[2].replace(/\/$/, '') : '');
    for (const rq of rest.matchAll(/require\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
      if (!rq[1].startsWith('.')) continue;
      const abs = resolveFrom(file, rq[1]);
      if (abs) collectRouter(abs, childPrefix, seen);
    }
  }
}

const server = fs.readFileSync(serverJs, 'utf8');

// `const platformRoutes = require('./modules/platform/...')` used by a mount below.
const varModule = {};
for (const d of server.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"`](\.[^'"`]+)['"`]\s*\)/g)) {
  varModule[d[1]] = d[2];
}

for (const m of server.matchAll(/app\.use\(\s*(['"`])(\/api[^'"`]*)\1([^\n]*)/g)) {
  const prefix = m[2];
  const rest = m[3];
  const mods = [...rest.matchAll(/require\(\s*['"`](\.[^'"`]+)['"`]\s*\)/g)].map((x) => x[1]);
  for (const v of [...rest.matchAll(/,\s*([A-Za-z_$][\w$]*)\s*\)/g)].map((x) => x[1])) {
    if (varModule[v]) mods.push(varModule[v]);
  }
  for (const rel of mods) {
    const abs = resolveFrom(serverJs, rel);
    if (abs) collectRouter(abs, prefix, new Set());
  }
}

// ── Frontend: every /api path referenced in src/ ───────────────────────────

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
};

// Paths that are prefixes or origins rather than endpoints: the dev proxy's
// allowlist and robots.txt's disallow rule both name '/api' itself.
const NOT_ENDPOINTS = new Set(['/api', '/api/auth', '/api/health']);

const calls = [];
for (const f of walk(FE_SRC)) {
  if (f.includes('__tests__')) continue;
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    for (const mm of line.matchAll(/['"`](\/api\/[^'"`\s)]*)['"`]/g)) {
      calls.push({ raw: mm[1], file: path.relative(FE_SRC, f), line: i + 1 });
    }
  });
}

/**
 * The path forms one call site could mean.
 *
 * `${...}` standing alone as a segment is a path parameter, so it becomes a
 * wildcard. But an interpolation GLUED to the end of a segment —
 * `/api/platform/users${suffix}` — is almost always a query string built by a
 * helper, and treating it as part of the path invents a route nobody serves.
 * Both readings are returned and a match on either is enough: the cost of the
 * extra candidate is a missed report in a case that does not arise, and the
 * cost of guessing wrong is a false failure on a healthy endpoint.
 */
const candidates = (raw) => {
  const base = raw.split('?')[0];
  const wild = base.replace(/\$\{[^}]*\}/g, ':p').replace(/\/+$/, '') || '/';
  const out = new Set([wild]);
  // Drop a trailing interpolation that is not a segment of its own.
  const glued = base.replace(/([^/])\$\{[^}]*\}$/, '$1').replace(/\/+$/, '');
  if (glued && glued !== base) out.add(glued.replace(/\$\{[^}]*\}/g, ':p'));
  return [...out];
};

const toRe = (p) =>
  new RegExp(`^${p.split('/').map((seg) => {
    if (seg.startsWith(':')) return '[^/]+';
    if (seg === '*') return '.*';
    return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/')}$`);

const backendRes = routes.map((r) => ({ ...r, re: toRe(r.path.replace(/\/$/, '') || '/') }));

const missing = new Map();
for (const c of calls) {
  const forms = candidates(c.raw);
  if (forms.some((n) => NOT_ENDPOINTS.has(n))) continue;
  // A call carrying a wildcard segment matches a route pattern in either
  // direction: the call may be concrete where the route has :id, or vice versa.
  const hit = forms.some((n) => backendRes.some((r) => r.re.test(n) || toRe(n).test(r.path)));
  if (!hit) {
    const label = forms[0];
    if (!missing.has(label)) missing.set(label, []);
    missing.get(label).push(c);
  }
}

console.log(`[api-contract] ${routes.length} backend routes, ${calls.length} frontend call sites.`);

if (missing.size === 0) {
  console.log('[api-contract] every frontend call resolves to a backend route.');
  process.exit(0);
}

console.error(`\n[api-contract] ${missing.size} path(s) with no backend route:\n`);
for (const [p, sites] of [...missing].sort()) {
  console.error(`  ${p}`);
  for (const s of sites.slice(0, 5)) console.error(`      src/${s.file}:${s.line}`);
  if (sites.length > 5) console.error(`      ...and ${sites.length - 5} more`);
}
console.error('\nEither the endpoint needs building, or the caller needs removing.');
console.error('A frontend method whose URL is not served is a 404 with a nav entry.\n');
process.exit(1);
