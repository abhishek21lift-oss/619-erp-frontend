// Route error boundaries — behaviour, not just presence.
//
// Audit finding H-02. A test that only asserts `error.tsx` files exist would
// pass on 27 empty files, so most of this exercises what the shared fallback
// actually does: the production message redaction, the Sentry report, and the
// shell/no-shell split that keeps an unauthenticated visitor out of a redirect
// loop.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { StrictMode } from 'react';
import fs from 'node:fs';
import path from 'node:path';

const captureError = vi.fn();
vi.mock('@/lib/sentry', () => ({
  captureError: (...args: unknown[]) => captureError(...args),
  initSentry: () => {},
}));

// Guard and AppShell need auth/theme providers and a router. Stub them so this
// suite tests the boundary, and so `shell` is observable: if the shelled path
// ever stops wrapping, the marker disappears.
vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="guard">{children}</div>
  ),
}));
vi.mock('@/components/AppShell', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="appshell">{children}</div>
  ),
}));

import RouteError from '@/components/RouteError';

const SECRET = 'Cannot read properties of undefined (reading \'orgId\') at /api/internal/x';

function err(message = SECRET, digest?: string) {
  return Object.assign(new Error(message), digest ? { digest } : {});
}

// vi.stubEnv is the supported way to change NODE_ENV for a test — a bare
// defineProperty on process.env throws ("only accepts a configurable, writable,
// and enumerable data descriptor").
//
// Worth noting what this does and does not prove: here NODE_ENV is a real
// runtime read, whereas Next.js inlines `process.env.NODE_ENV !== 'production'`
// at build time and eliminates the branch entirely. So this verifies the
// condition is written correctly; the bundler is what enforces it in the
// shipped output.
const setEnv = (v: string) => vi.stubEnv('NODE_ENV', v);

beforeEach(() => captureError.mockReset());
afterEach(() => { vi.unstubAllEnvs(); cleanup(); });

describe('<RouteError /> — what the user sees', () => {
  it('announces itself to assistive technology', () => {
    render(<RouteError error={err()} reset={() => {}} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('never prints the raw error message in production', async () => {
    // The defect this replaces: src/app/error.tsx rendered {error.message}
    // unconditionally. Next.js only redacts messages for SERVER component
    // errors, and 108 of the 111 pages are 'use client', so real messages
    // reached production browsers.
    setEnv('production');
    render(<RouteError error={err()} reset={() => {}} segment="finance" />);
    expect(screen.queryByText(/orgId/)).not.toBeInTheDocument();
    expect(screen.queryByText(/api\/internal/)).not.toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it('does show the message in development, where it is useful', () => {
    setEnv('development');
    render(<RouteError error={err()} reset={() => {}} />);
    expect(screen.getByText(/orgId/)).toBeInTheDocument();
  });

  it('shows the digest so support can match a screenshot to a stack trace', () => {
    setEnv('production');
    render(<RouteError error={err(SECRET, 'abc123def')} reset={() => {}} />);
    expect(screen.getByText(/abc123def/)).toBeInTheDocument();
  });

  it('names the failing area and says the rest of the app still works', () => {
    render(<RouteError error={err()} reset={() => {}} segment="finance" />);
    expect(screen.getByText(/finance/)).toBeInTheDocument();
    expect(screen.getByText(/rest of the app is still working/)).toBeInTheDocument();
  });

  it('offers both a retry and a way out', () => {
    const reset = vi.fn();
    render(<RouteError error={err()} reset={reset} />);
    screen.getByRole('button', { name: /try again/i }).click();
    expect(reset).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: /back to app/i })).toHaveAttribute('href', '/');
  });
});

describe('<RouteError /> — reporting', () => {
  it('reports to Sentry', async () => {
    render(<RouteError error={err()} reset={() => {}} segment="finance" />);
    await waitFor(() => expect(captureError).toHaveBeenCalled());
    expect(captureError.mock.calls[0][1]).toContain('finance');
  });

  it('reports once per error even under StrictMode double-invoke', async () => {
    // The old root error.tsx reported nothing at all; the risk in fixing that
    // is over-reporting, which makes Sentry issue counts lie.
    //
    // This has to run inside StrictMode to mean anything. My first version used
    // rerender() with unchanged props — React skips the effect when the
    // dependency array is unchanged, so the dedupe ref was never exercised and
    // deleting it still passed. StrictMode genuinely mounts, unmounts and
    // remounts, running the effect body twice while preserving refs, which is
    // exactly the case the ref exists for.
    const e = err();
    render(
      <StrictMode>
        <RouteError error={e} reset={() => {}} segment="finance" />
      </StrictMode>,
    );
    await waitFor(() => expect(captureError).toHaveBeenCalled());
    expect(captureError).toHaveBeenCalledTimes(1);
  });
});

describe('<RouteError /> — the shell decision', () => {
  it('wraps authenticated areas in Guard + AppShell so the nav survives', () => {
    // Pages mount <Guard><AppShell> themselves — there are no segment layouts —
    // so a segment error.tsx replaces the chrome too. Re-rendering it is what
    // lets the user navigate away from a broken page.
    render(<RouteError error={err()} reset={() => {}} shell segment="finance" />);
    expect(screen.getByTestId('guard')).toBeInTheDocument();
    expect(screen.getByTestId('appshell')).toBeInTheDocument();
  });

  it('does NOT wrap public routes, which would loop through /login', () => {
    // Guard calls router.replace('/login') with no session. On /login that
    // fallback redirects to the route that just threw.
    render(<RouteError error={err()} reset={() => {}} shell={false} segment="login" />);
    expect(screen.queryByTestId('guard')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('every route segment has a boundary', () => {
  const APP = path.join(process.cwd(), 'src/app');

  /** Top-level segments that contain at least one page. */
  const segments = fs.readdirSync(APP, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'api')
    .map((e) => e.name)
    .filter((name) => {
      const walk = (d: string): boolean =>
        fs.readdirSync(d, { withFileTypes: true }).some((e) =>
          e.isDirectory() ? walk(path.join(d, e.name)) : e.name === 'page.tsx');
      return walk(path.join(APP, name));
    });

  // Public and auth surfaces: no session, so no Guard in the fallback.
  // `client` is the client activation flow — somebody following a link from
  // their trainer's email who does not have an account yet, so it belongs
  // here for exactly the reason `auth` does.
  const PUBLIC = new Set([
    'appointments', 'auth', 'client', 'forgot-password', 'login',
    // The client-facing half of the sign-in split. Public for the same reason
    // 'login' is: nobody reaching it has a session yet.
    'member-login',
    'reset-password', 'start-free',
  ]);

  it('found the segments, so this cannot pass vacuously', () => {
    expect(segments.length).toBeGreaterThan(20);
    expect(segments).toContain('finance');
    expect(segments).toContain('login');
  });

  it('has an error.tsx in every segment that owns pages', () => {
    const missing = segments
      .filter((s) => !s.startsWith('['))
      .filter((s) => !fs.existsSync(path.join(APP, s, 'error.tsx')));
    expect(missing).toEqual([]);
  });

  it('gives each segment the right shell setting', () => {
    // Getting this backwards is silent: a shelled boundary on /login only
    // misbehaves for a logged-out user hitting an error, which no build step
    // would reveal.
    const wrong: string[] = [];
    for (const s of segments.filter((x) => !x.startsWith('['))) {
      const f = path.join(APP, s, 'error.tsx');
      if (!fs.existsSync(f)) continue;
      const src = fs.readFileSync(f, 'utf8');
      const bare = /shell=\{false\}/.test(src);
      if (PUBLIC.has(s) !== bare) {
        wrong.push(`${s}: shell=${!bare}, expected shell=${!PUBLIC.has(s)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('routes every boundary through the shared component', () => {
    // 27 hand-written fallbacks would drift. If one stops importing RouteError,
    // the redaction and reporting guarantees above stop applying to it.
    const offenders = segments
      .filter((s) => !s.startsWith('['))
      .filter((s) => fs.existsSync(path.join(APP, s, 'error.tsx')))
      .filter((s) => !/from '@\/components\/RouteError'/
        .test(fs.readFileSync(path.join(APP, s, 'error.tsx'), 'utf8')));
    expect(offenders).toEqual([]);
    expect(fs.readFileSync(path.join(APP, 'error.tsx'), 'utf8'))
      .toMatch(/from '@\/components\/RouteError'/);
  });
});

// ── A tab that was open across a deploy ─────────────────────────────────────
//
// Next.js splits code per route, so a page left open while a new version ships
// asks for chunk filenames the new build does not serve. That 404 lands in this
// boundary and reads as "this part of the app failed to load" — which is true,
// and which no amount of `reset()` can fix, because reset re-renders the same
// shell asking for the same missing file. It has to be a document fetch.
//
// The loop guard is the part that actually needs testing: a chunk can also be
// missing because a deploy is broken, and an unguarded reload there refreshes
// the app forever, which is much worse than an error card.
describe('RouteError — stale build after a deploy', () => {
  const reload = vi.fn();
  let store: Record<string, string> = {};

  beforeEach(() => {
    reload.mockClear();
    store = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
    Object.defineProperty(window, 'location', {
      configurable: true, value: { ...window.location, reload },
    });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  const chunkErr = () => Object.assign(new Error('Loading chunk 4821 failed.'), {
    name: 'ChunkLoadError',
  });

  it('reloads once, and says it is updating rather than blaming the app', async () => {
    render(<RouteError error={chunkErr()} reset={() => {}} segment="pt-os" />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Updating to the latest version/)).toBeTruthy();
    expect(screen.queryByText(/failed to load/)).toBeNull();
  });

  it('does not reload a second time — a broken deploy must not refresh forever', async () => {
    store['route-error:stale-build-reload'] = String(Date.now());
    render(<RouteError error={chunkErr()} reset={() => {}} segment="pt-os" />);
    await waitFor(() => expect(screen.getByText(/Refresh the page/)).toBeTruthy());
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads again for a later deploy in a long-lived session', async () => {
    store['route-error:stale-build-reload'] = String(Date.now() - 120_000);
    render(<RouteError error={chunkErr()} reset={() => {}} segment="pt-os" />);
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('leaves a genuine application error alone', async () => {
    render(<RouteError error={new Error('boom')} reset={() => {}} segment="pt-os" />);
    await waitFor(() => expect(screen.getByText(/Something went wrong/)).toBeTruthy());
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByText(/This part of the app \(pt-os\) failed to load/)).toBeTruthy();
  });

  it('matches the other bundlers\' wording too, not just webpack\'s', async () => {
    render(
      <RouteError
        error={new Error('Failed to fetch dynamically imported module: /_next/x.js')}
        reset={() => {}}
      />,
    );
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});
