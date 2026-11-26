// The API contract check reads `app.use()` mounts in the backend's server.js.
//
// ── Why this test ─────────────────────────────────────────────────────────
//
// The parser used to read one line at a time. A mount written across several
// lines — which is what a mount with four guards and a long path looks like —
// had its `require()` on a later line and was invisible, so every endpoint
// behind it was reported as missing. That is what failed the member AI PR's
// E2E job against a backend branch that did serve the routes.
//
// The script needs both repositories, so this test builds two small fixtures
// and runs the real script against them. The positive case is the regression:
// a multi-line mount must resolve. The negative case proves the check still
// fails when a call genuinely has no route, rather than passing everything.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Vitest runs from the frontend root, and jsdom rewrites import.meta.url to an
// http URL, so the working directory is the reliable anchor.
const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'scripts', 'api-contract-check.mjs');

let fixture = '';

function write(path: string, body: string) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  writeFileSync(path, body);
}

function run(backend: string, frontend: string) {
  return spawnSync(
    process.execPath,
    [SCRIPT, '--backend', backend, '--frontend', frontend],
    { encoding: 'utf8' },
  );
}

beforeAll(() => {
  fixture = mkdtempSync(join(tmpdir(), 'api-contract-'));

  write(
    join(fixture, 'backend', 'src', 'server.js'),
    `const app = require('./app');
const auth = (req, res, next) => next();

app.use('/api/me/ai',
  auth,
  requireFeature('ai_suite'),
  require('./routes/member-ai'));
`,
  );

  write(
    join(fixture, 'backend', 'src', 'routes', 'member-ai.js'),
    `const express = require('express');
const router = express.Router();
router.get('/history', handler);
router.post('/chat', handler);
module.exports = router;
`,
  );

  write(
    join(fixture, 'frontend', 'calls.ts'),
    `export const history = () => fetch('/api/me/ai/history');
export const chat = () => fetch('/api/me/ai/chat');
`,
  );
});

afterAll(() => {
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe('the API contract check', () => {
  it('resolves a mount written across several lines', () => {
    const result = run(join(fixture, 'backend'), join(fixture, 'frontend'));

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('every frontend call resolves');
  });

  it('still fails when a call has no backend route', () => {
    const frontend = join(fixture, 'frontend-missing');
    write(
      join(frontend, 'calls.ts'),
      `export const missing = () => fetch('/api/me/ai/nowhere');`,
    );

    const result = run(join(fixture, 'backend'), frontend);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('/api/me/ai/nowhere');
  });
});
