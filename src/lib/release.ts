// src/lib/release.ts
//
// Which build is this — the frontend's half of the cross-repo release contract.
// See COMPATIBILITY.md in 619-erp-backend for the rule and the current matrix.
//
// ── What this reported before ──────────────────────────────────────────────
//
// `process.env.npm_package_version`, with a comment calling it "the correct,
// path-agnostic approach". It is path-agnostic and it is empty in production:
// npm sets that variable only when it is the thing launching the process, and
// the production container runs `node server.js` directly from the standalone
// output. So the health endpoint reported version "unknown" on every deployed
// build and the real version everywhere else — the shape of drift that is
// invisible precisely where it matters.
//
// The commit has the same constraint for a different reason: the production
// image has no .git directory, so it has to arrive as a build ARG.

/**
 * The oldest backend contract this build can talk to.
 *
 * Stated so a mismatch is a refusal with two numbers in it, rather than a
 * field that silently arrives undefined and renders as an empty card.
 */
export const MIN_BACKEND_CONTRACT = 1;

function normalizeSha(raw: string | undefined): string {
  const sha = String(raw ?? '').trim();
  // `$` catches an unsubstituted build arg — "${GIT_SHA}" is the most likely
  // wrong value to arrive here and would otherwise be reported as a commit.
  if (!sha || sha.includes('$') || !/^[0-9a-f]{7,40}$/i.test(sha)) return 'unknown';
  return sha.toLowerCase();
}

export interface ReleaseInfo {
  service: 'frontend';
  version: string;
  sha: string;
  builtAt: string | null;
  minBackendContract: number;
  env: string;
}

export function releaseInfo(): ReleaseInfo {
  return {
    service: 'frontend',
    // APP_VERSION is baked by the Dockerfile from package.json at build time.
    // npm_package_version is kept as the fallback for `npm run dev`, where it
    // IS set and is correct — the two cover opposite environments.
    version: process.env.APP_VERSION || process.env.npm_package_version || 'unknown',
    sha: normalizeSha(process.env.GIT_SHA),
    builtAt: process.env.BUILD_TIME || null,
    minBackendContract: MIN_BACKEND_CONTRACT,
    env: process.env.NODE_ENV ?? 'development',
  };
}

export { normalizeSha };
