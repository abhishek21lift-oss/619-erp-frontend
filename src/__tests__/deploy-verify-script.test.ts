// The deploy gate, exercised as the box runs it.
//
// The backend carried this logic inside deploy.yml, where no test could reach
// it, and it never executed in production: the container started and the
// script exited 1 forty-one milliseconds later, silently. This repository had
// the same shape and had simply not failed yet.
//
// It is a real file now, so these run it: against a real HTTP server, covering
// both ways the gate can be wrong — passing a deploy that did not happen, and
// failing one that did.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFile } from 'node:child_process';

const SCRIPT = path.join(process.cwd(), 'scripts', 'deploy', 'verify-serving.sh');
const SHA = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
const OTHER_SHA = '0000111122223333444455556666777788889999';

function serve(handler: http.RequestListener): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function runScript(args: string[], env: Record<string, string> = {}) {
  return new Promise<{ code: number; stdout: string }>((resolve) => {
    execFile(
      'bash',
      [SCRIPT, ...args],
      { env: { ...process.env, VERIFY_ATTEMPTS: '2', VERIFY_INTERVAL: '0', ...env }, timeout: 30_000 },
      (err, stdout) => resolve({ code: err ? ((err as never as { code?: number }).code ?? 1) : 0, stdout: String(stdout) }),
    );
  });
}

describe('deploy verification script', () => {
  let server: http.Server | undefined;
  let tmp: string;
  let marker: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deployverify-'));
    marker = path.join(tmp, '.frontend-deployed-sha');
    fs.writeFileSync(`${marker}.new`, `${SHA}\n`);
  });

  afterEach(() => {
    if (server) { server.close(); server = undefined; }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  async function verifyAgainst(payload: string) {
    server = await serve((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(payload);
    });
    const port = (server.address() as { port: number }).port;
    return runScript([SHA, tmp, 'frontend', `http://127.0.0.1:${port}/api/health`, marker]);
  }

  it('accepts the compact JSON the route actually emits', async () => {
    const r = await verifyAgainst(JSON.stringify({ status: 'ok', release: { sha: SHA } }));
    expect(r.stdout).toContain('deploy verified');
    expect(r.code).toBe(0);
  });

  it('accepts a pretty-printed payload too', async () => {
    const r = await verifyAgainst(JSON.stringify({ status: 'ok', release: { sha: SHA } }, null, 2));
    expect(r.stdout).toContain('deploy verified');
    expect(r.code).toBe(0);
  });

  it('advances the marker only on success', async () => {
    await verifyAgainst(JSON.stringify({ release: { sha: SHA } }));
    expect(fs.readFileSync(marker, 'utf8').trim()).toBe(SHA);
    expect(fs.existsSync(`${marker}.new`)).toBe(false);
  });

  it('fails when the container serves a DIFFERENT commit', async () => {
    const r = await verifyAgainst(JSON.stringify({ release: { sha: OTHER_SHA } }));
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('::error::deploy verification failed');
  });

  it('leaves the marker naming the last good commit when verification fails', async () => {
    fs.writeFileSync(marker, `${OTHER_SHA}\n`);
    await verifyAgainst(JSON.stringify({ release: { sha: OTHER_SHA } }));
    expect(fs.readFileSync(marker, 'utf8').trim()).toBe(OTHER_SHA);
    expect(fs.existsSync(`${marker}.new`)).toBe(false);
  });

  it('fails, rather than hanging, when nothing is listening', async () => {
    const r = await runScript([SHA, tmp, 'frontend', 'http://127.0.0.1:1/api/health', marker]);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain('no answer');
  });

  it('polls rather than giving up on the first miss', async () => {
    let asked = 0;
    server = await serve((_req, res) => {
      asked += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ release: { sha: asked === 1 ? OTHER_SHA : SHA } }));
    });
    const port = (server.address() as { port: number }).port;
    const r = await runScript([SHA, tmp, 'frontend', `http://127.0.0.1:${port}/api/health`, marker], { VERIFY_ATTEMPTS: '5' });
    expect(r.code).toBe(0);
    expect(asked).toBeGreaterThan(1);
  });
});
