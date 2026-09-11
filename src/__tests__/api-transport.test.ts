// Every call to the API carries the caller's tenant identity.
//
// ── The defect this prevents ───────────────────────────────────────────────
//
// lib/http.ts attaches one of two identity headers to every request:
//
//   Authorization: Bearer <token>   while impersonating a studio admin
//   x-org-id: <uuid>                while a super_admin has an org pinned
//
// Two call sites bypassed it with a raw fetch() and sent neither:
// lib/ai-stream.ts (needs the raw body to stream tokens as they arrive) and
// the enrolment-PDF download (needs a Blob).
//
// For a tenant user that was harmless — the backend's tenantScope() ignores
// `x-org-id` from anyone who is not a super_admin, so their org is still their
// own. For a platform operator it was not. With the org switcher pinned to one
// studio, the request arrived with no target, tenantScope() resolved
// applyFilter=false, and the call ran PLATFORM-WIDE. On /api/ai/chat the
// backend's orgParam() then returns null and every query behind it reads
// `$n IS NULL OR organization_id = $n` — which matches every row in every
// studio. The operator sees a conversation they believe is scoped to one
// studio, answered from all of them. Impersonation failed the same way: the
// Bearer token never travelled, so the call ran as the operator rather than as
// the studio admin being impersonated.
//
// ── Why a source scan ──────────────────────────────────────────────────────
//
// The bug is not "sends the wrong value", it is "does not send at all", and it
// is introduced by writing fetch() instead of http(). Nothing at runtime
// notices: the request succeeds, it is simply scoped wider than the UI claims.
// A scan is what catches the NEXT one.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(__dirname, '..');

/** Every .ts/.tsx under src/, excluding tests. */
function sourceFiles(dir = SRC, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      sourceFiles(full, out);
    } else if (/\.tsx?$/.test(e.name)) out.push(full);
  }
  return out;
}

const files = sourceFiles();

/**
 * A fetch() whose URL names an API path. `lib/http.ts` is the transport itself
 * and is allowed to call fetch — it is what everything else routes through.
 */
const API_FETCH = /fetch\(\s*[`'"][^`'"]*\/api\//;

/**
 * Every direct API fetch, paired with the CALL's own init object.
 *
 * The block matters. An earlier version of this test asked whether the FILE
 * mentioned tenantAuthHeaders anywhere, and a mutation that removed the
 * headers from the fetch while leaving the import and the comment in place
 * sailed through it. What has to carry the identity is the call, so the call
 * is what gets read: from the `fetch(` line to the line that closes its
 * argument list at the same brace depth.
 */
function directApiFetches(): { file: string; line: number; block: string }[] {
  const hits: { file: string; line: number; block: string }[] = [];
  for (const f of files) {
    const rel = path.relative(SRC, f);
    if (rel === path.join('lib', 'http.ts')) continue; // the transport itself
    const lines = fs.readFileSync(f, 'utf8').split('\n');
    lines.forEach((text, i) => {
      if (!API_FETCH.test(text)) return;
      let depth = 0;
      let seenOpen = false;
      const block: string[] = [];
      for (let j = i; j < Math.min(lines.length, i + 40); j++) {
        block.push(lines[j]);
        for (const ch of lines[j]) {
          if (ch === '(') { depth++; seenOpen = true; }
          else if (ch === ')') depth--;
        }
        if (seenOpen && depth <= 0) break;
      }
      // Comments are stripped before the block is handed back. They sit
      // INSIDE the call — both call sites carry a note explaining why they
      // fetch directly — and those notes name tenantAuthHeaders(). A mutation
      // that removed the headers but left the comment passed this test until
      // the strip went in.
      const code = block
        .join('\n')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      hits.push({ file: rel, line: i + 1, block: code });
    });
  }
  return hits;
}

describe('api transport', () => {
  it('scans a real set of source files', () => {
    // Without this the whole suite passes vacuously if the walk ever breaks.
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.endsWith(path.join('lib', 'http.ts')))).toBe(true);
    expect(files.some((f) => f.endsWith(path.join('lib', 'ai-stream.ts')))).toBe(true);
  });

  it('every direct fetch() to the API attaches the tenant identity headers', () => {
    // Not a ban on direct fetch — two call sites legitimately need the raw
    // Response. The requirement is that they carry the identity, which means
    // naming tenantAuthHeaders() in the same file.
    const offenders = directApiFetches()
      .filter(({ block }) => !/tenantAuthHeaders\(\)/.test(block))
      .map(({ file, line, block }) => `${file}:${line}  ${block.split('\n')[0].trim()}`);
    expect(offenders).toEqual([]);
  });

  it('the two known direct-fetch call sites still carry them', () => {
    // Asserted positively as well: "no offenders" is also satisfied by the
    // fetch disappearing, and these two features are supposed to exist.
    const byFile = new Map(directApiFetches().map((h) => [h.file, h.block]));
    for (const rel of ['lib/ai-stream.ts', 'app/(chrome)/pt-os/clients/[id]/enroll/page.tsx']) {
      const block = byFile.get(rel);
      expect(block, `${rel} no longer fetches the API`).toBeDefined();
      expect(block).toMatch(/tenantAuthHeaders\(\)/);
    }
  });

  it('the transport defines the identity rule exactly once', () => {
    // Two definitions drift, and the one that drifts is the one that stops
    // suppressing the org header while impersonating.
    const http = fs.readFileSync(path.join(SRC, 'lib', 'http.ts'), 'utf8');
    expect(http.match(/export function tenantAuthHeaders/g) || []).toHaveLength(1);
    // http() and httpSSE() both go through it rather than rebuilding it.
    expect(http.match(/\.\.\.tenantAuthHeaders\(\)/g) || []).toHaveLength(2);
    // …and the raw rule is not open-coded anywhere outside that function.
    const openCoded = files.filter((f) => {
      const rel = path.relative(SRC, f);
      if (rel === path.join('lib', 'http.ts')) return false;
      return /Authorization: `Bearer \$\{imp/.test(fs.readFileSync(f, 'utf8'));
    });
    expect(openCoded).toEqual([]);
  });

  it('impersonation suppresses the org-switcher header', () => {
    // The two headers are mutually exclusive by design: while impersonating,
    // the Bearer token IS the identity and the operator's pinned org must not
    // also travel, or the backend would see a target that contradicts it.
    const http = fs.readFileSync(path.join(SRC, 'lib', 'http.ts'), 'utf8');
    const fn = http.slice(http.indexOf('export function tenantAuthHeaders'));
    expect(fn.slice(0, 400)).toMatch(/imp\s*\?\s*\{\s*Authorization[\s\S]*?:\s*activeOrgHeader\(\)/);
  });
});
