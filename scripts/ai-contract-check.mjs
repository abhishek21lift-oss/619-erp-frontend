#!/usr/bin/env node
/**
 * The AI streaming contract, checked against the backend that will serve it.
 *
 * ── Why this exists ────────────────────────────────────────────────────
 *
 * routes/ai.js streams Server-Sent Events whose `type` field this repo
 * switches on. Nothing connected the two: the backend could add an event
 * type, or rename one, and the frontend would silently fall through its
 * switch and drop it. That is invisible by construction — a dropped event
 * renders as nothing, which is also what a healthy quiet stream renders as.
 *
 * It stopped being hypothetical the moment the backend gained a `grounding`
 * event. That event's entire job is to tell the reader an answer was
 * produced WITHOUT the studio's documents. Dropped, the reader sees a
 * confident ungrounded answer and no indication of it — the exact failure
 * the event was added to prevent.
 *
 * The check is deliberately one-directional: every type the backend EMITS
 * must be handled here. The reverse is fine — this repo may handle a type
 * the backend has stopped sending, which is just dead code, not a lie on
 * screen.
 *
 * Usage: node scripts/ai-contract-check.mjs --backend ../backend
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const backendArg = process.argv.indexOf('--backend');
if (backendArg === -1 || !process.argv[backendArg + 1]) {
  console.error('usage: node scripts/ai-contract-check.mjs --backend <path-to-619-erp-backend>');
  process.exit(2);
}
const backendRoot = process.argv[backendArg + 1];

const backendSrc = readFileSync(join(backendRoot, 'src', 'routes', 'ai.js'), 'utf8');
const streamSrc = readFileSync(join(process.cwd(), 'src', 'lib', 'ai-stream.ts'), 'utf8');

// What the backend actually sends: `send({ type: 'x'` on the chat stream.
const emitted = new Set(
  [...backendSrc.matchAll(/send\(\{\s*type:\s*'([a-z_]+)'/g)].map((m) => m[1])
);

// What this repo handles: `case 'x':` inside ai-stream.ts's dispatch.
const handled = new Set([...streamSrc.matchAll(/case\s+'([a-z_]+)':/g)].map((m) => m[1]));

// And what its own type union admits, so the switch and the type cannot drift.
const unionMatch = streamSrc.match(/type:\s*((?:'[a-z_]+'\s*\|\s*)+'[a-z_]+')/);
const declared = new Set(
  unionMatch ? [...unionMatch[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]) : []
);

if (emitted.size === 0) {
  console.error('[ai-contract] found no emitted event types in the backend — the matcher is broken, not the contract.');
  process.exit(1);
}

const unhandled = [...emitted].filter((t) => !handled.has(t));
const undeclared = [...emitted].filter((t) => !declared.has(t));

console.info(`[ai-contract] backend emits: ${[...emitted].sort().join(', ')}`);
console.info(`[ai-contract] frontend handles: ${[...handled].sort().join(', ')}`);

let failed = false;
if (unhandled.length) {
  console.error(
    `[ai-contract] the backend emits ${unhandled.map((t) => `"${t}"`).join(', ')} and this repo does not handle it. ` +
    'A dropped SSE event renders as nothing, which is indistinguishable from a healthy stream.'
  );
  failed = true;
}
if (undeclared.length) {
  console.error(
    `[ai-contract] ${undeclared.map((t) => `"${t}"`).join(', ')} is emitted but missing from AiStreamEvent's type union.`
  );
  failed = true;
}
if (failed) process.exit(1);

console.info('[ai-contract] every event the backend emits is handled here.');
