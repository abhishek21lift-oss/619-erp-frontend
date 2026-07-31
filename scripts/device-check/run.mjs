// Render the app at 390px in a real browser and check it.
//
// ── Why this exists ────────────────────────────────────────────────────────
//
// The workout module shipped over five commits verified only by tsc, eslint,
// the production build and unit tests. All four are blind to layout: a card
// 40px wider than the phone compiles, lints, builds and passes every test.
// This opens the pages in Chromium at 390×844 — the iPhone 12/13/14/15 logical
// width, and the narrowest screen the studio's trainers actually carry — and
// asserts the three things that are objectively checkable.
//
// ── Why it mocks the API instead of running the backend ────────────────────
//
// A live stack means Postgres, 136 migrations and seed data, and it would give
// WORSE coverage: real rows are mostly short and tidy, and layouts break on the
// long tail. fixtures.mjs serves deliberately extreme data instead. The real
// components render with the real CSS; only the JSON is invented.
//
// Auth needs no token. The gate is Guard.tsx, which asks useAuth() for a user,
// and useAuth gets its user from /api/auth/me — which is mocked. Cookies never
// enter into it.
//
// ── Why it builds every time ───────────────────────────────────────────────
//
// NEXT_PUBLIC_API_URL is inlined into the client bundle at BUILD time. A build
// made with the deploy's API URL would send fetches to an origin this script is
// not intercepting, and the pages would render their error states while the run
// reported success. Building here with the API URL pointed at our own origin
// removes both the cross-origin problem and that trap.
//
// Usage:  npm run device-check            all routes, both themes
//         npm run device-check -- --light only the light theme
//         npm run device-check -- --route=/pt-os/workout-plans
//
// Exits non-zero if any assertion fails. Screenshots go to OUT_DIR (printed at
// the end); they are output to look at, not artefacts to commit.

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve as resolveFixture, IDS } from './fixtures.mjs';

// playwright is installed globally in this environment, not as a project
// dependency — the app does not ship a browser driver and should not start.
const require_ = createRequire(import.meta.url);
const { chromium } = require_(
  process.env.PLAYWRIGHT_PATH
  ?? '/opt/node22/lib/node_modules/playwright',
);

const PORT = Number(process.env.DEVICE_CHECK_PORT ?? 3100);
const ORIGIN = `http://localhost:${PORT}`;
const OUT_DIR = process.env.DEVICE_CHECK_OUT
  ?? path.join(process.cwd(), '.device-check');

/** iPhone 12/13/14/15 logical viewport. */
/**
 * The widths this runs at.
 *
 * 390×844 is the iPhone 12-15 logical viewport and the narrowest screen the
 * studio's trainers carry. 1280×900 was added after a clipped submenu shipped:
 * the panel fitted at 390px and was cut in half on a laptop, so a phone-only
 * check reported green on a bug the owner could see. Layout bugs are
 * width-dependent in both directions; one width is not coverage.
 *
 * `touch` drives the 44px assertion — a rule about thumbs, not about mice, so
 * it is not applied to the desktop pass.
 */
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'desktop', width: 1280, height: 900, touch: false },
];

/**
 * A `token` cookie that satisfies the edge guard in src/proxy.ts.
 *
 * That guard runs BEFORE any page renders and redirects to /login when the
 * cookie is missing — which is server-side, so mocking /api/auth/me in the
 * browser does not help. Every route 307s to /login without this.
 *
 * The token is not signed, and does not need to be: with JWT_SECRET unset the
 * guard takes its fallback path and checks only that the token is well formed
 * and unexpired, leaving real signature verification to the backend on every
 * API call. The runner therefore starts the server with JWT_SECRET deliberately
 * removed — see the spawn below. If it were set, this token would be rejected
 * and every route would redirect again.
 */
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const FAKE_TOKEN = [
  b64u({ alg: 'HS256', typ: 'JWT' }),
  b64u({
    id: 'u-1',
    role: 'trainer',
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  }),
  'device-check-not-a-real-signature',
].join('.');

/** Anything a thumb must hit should be at least this tall and wide. */
const MIN_TOUCH = 44;

/**
 * `open` drives the route into an interaction state before the audit runs.
 *
 * A sheet that only exists after a tap is exactly the kind of surface that
 * never gets looked at, and it is the one most likely to overflow: it is
 * bottom-anchored, full-width and full of inputs.
 */
const ROUTES = [
  ['workout-plans', '/pt-os/workout-plans'],
  ['new-programme-sheet', '/pt-os/workout-plans', async (page) => {
    await page.getByRole('button', { name: /new plan/i }).first().click();
    await page.waitForTimeout(500);
  }],
  ['builder', `/pt-os/clients/${IDS.client}/training/builder?plan=${IDS.plan}`],
  ['exercise-picker', `/pt-os/clients/${IDS.client}/training/builder?plan=${IDS.plan}`, async (page) => {
    await page.getByRole('button', { name: 'Add exercise', exact: true }).first().click();
    await page.waitForTimeout(500);
  }],
  ['card-advanced-open', `/pt-os/clients/${IDS.client}/training/builder?plan=${IDS.plan}`, async (page) => {
    await page.getByRole('button', { name: /tempo, rpe, warm-up/i }).first().click();
    await page.waitForTimeout(400);
  }],

  // The progression half of the builder. `builder` above already covers the
  // rule card and the ramp lines at rest; these two are the states that only
  // exist after a tap, and are therefore the ones nobody looks at.
  ['builder-derived-week', `/pt-os/clients/${IDS.client}/training/builder?plan=${IDS.plan}`, async (page) => {
    await page.getByRole('button', { name: 'Next week' }).first().click();
    await page.waitForTimeout(600);
  }],
  ['builder-version-history', `/pt-os/clients/${IDS.client}/training/builder?plan=${IDS.plan}`, async (page) => {
    await page.getByRole('button', { name: /view history/i }).first().click();
    await page.waitForTimeout(600);
  }],
  ['builder-empty-day', `/pt-os/clients/${IDS.client}/training/builder?plan=${IDS.emptyPlan}`],
  ['assigned', `/pt-os/clients/${IDS.client}/training/assigned`],
  ['analytics', `/pt-os/clients/${IDS.client}/training/analytics`],
  ['workout-log', `/pt-os/clients/${IDS.client}/workout-log`],
  ['client-profile', `/pt-os/clients/${IDS.client}`],

  // Today — the screen a trainer opens daily, and the finish sheet at the end
  // of a session. Neither existed before this phase, so neither had coverage.
  ['today', '/pt-os/today'],
  ['session-finish-sheet', `/pt-os/clients/${IDS.client}/workout-log/${IDS.session}`, async (page) => {
    await page.getByRole('button', { name: /finish workout/i }).first().click();
    await page.waitForTimeout(500);
  }],

  // Both Quick Actions submenus, opened. These shipped clipped — the card
  // around them hid its overflow, so half of each menu was unreachable — and
  // no check covered them because a closed menu renders nothing. The tile
  // lookup is scoped to the card: the sidebar has its own "Screening" nav
  // group, and at 390px it sits off-canvas and cannot be clicked.
  ['client-profile-training-menu', `/pt-os/clients/${IDS.client}`, async (page) => {
    await page.locator('div.mb-6').getByRole('button', { name: 'Training', exact: true })
      .first().click();
    await page.waitForTimeout(450);
  }],
  ['client-profile-screening-menu', `/pt-os/clients/${IDS.client}`, async (page) => {
    await page.locator('div.mb-6').getByRole('button', { name: 'Screening', exact: true })
      .first().click();
    await page.waitForTimeout(450);
  }],
];

const args = process.argv.slice(2);
const themes = args.includes('--light') ? ['light']
  : args.includes('--dark') ? ['dark']
    : ['light', 'dark'];
const only = args.find((a) => a.startsWith('--route='))?.slice('--route='.length);

// ── Build and serve ─────────────────────────────────────────────────────────

function run(cmd, cmdArgs, env) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, cmdArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { out += d; });
    p.on('exit', (code) => (code === 0 ? res(out) : rej(new Error(out.slice(-3000)))));
  });
}

/**
 * Refuse to run if something is already listening on PORT.
 *
 * waitForServer only asks whether SOMETHING answers, so a `next start` left
 * behind by an earlier crashed run happily answered — from a build that had
 * since been deleted. Three runs reported ChunkLoadError on every route and
 * screenshotted a blank LOADING screen before the cause turned out to be an
 * orphaned server, not the app. Failing loudly here is the fix; the message
 * names the port so the remedy is obvious.
 */
async function assertPortFree() {
  try {
    await fetch(ORIGIN, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
  } catch {
    return;                      // nothing listening: what we want
  }
  throw new Error(
    `something is already serving ${ORIGIN}. It is probably a next-server left `
    + 'behind by an earlier run, and it will serve a stale build. '
    + 'Stop it first (pkill -f next-server) or set DEVICE_CHECK_PORT.',
  );
}

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(ORIGIN, { redirect: 'manual' });
      if (r.status > 0) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not come up on ${ORIGIN}`);
}

// ── Assertions ──────────────────────────────────────────────────────────────

/**
 * The three checks, run in the page.
 *
 * Returned rather than thrown so one failing route does not stop the others —
 * seeing all the defects in one run is the point.
 */
const AUDIT = ({ width, minTouch }) => {
  const problems = [];
  const label = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`;
  };

  // 1. The page itself must not scroll sideways.
  const docWidth = document.documentElement.scrollWidth;
  if (docWidth > width) {
    problems.push({ kind: 'page-overflow', detail: `document scrollWidth ${docWidth} > ${width}` });
  }

  // An element inside a deliberately scrollable strip (the builder's day tabs)
  // is meant to extend past the edge.
  const inScroller = (el) => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowX;
      if (o === 'auto' || o === 'scroll') return true;
    }
    return false;
  };

  // Parked entirely off-canvas: the desktop drawer at 390px, a closed sheet.
  // It is not overflowing anything, and reporting it buries the real findings
  // under a hundred lines of sidebar.
  const offCanvas = (r) => r.right <= 0 || r.left >= width;

  // Hidden from the accessibility tree, or a visually-hidden input whose
  // visible control is a sibling — the sr-only checkbox pattern.
  const decorative = (el) => el.closest('[aria-hidden="true"], [inert]') !== null;
  const srOnly = (r) => r.width <= 1 || r.height <= 1;

  // SVG internals: the icon's own box is what a thumb hits, not its paths.
  const insideSvg = (el) => el.ownerSVGElement != null;

  // 2. Name the elements that stick out, so a failure is actionable.
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    if (offCanvas(r) || decorative(el) || insideSvg(el)) continue;
    if (r.right > width + 0.5 || r.left < -0.5) {
      if (inScroller(el)) continue;
      problems.push({
        kind: 'element-overflow',
        detail: `${label(el)} spans ${Math.round(r.left)}…${Math.round(r.right)}`,
      });
    }
  }

  // 3. Touch targets. minTouch is 0 on the desktop pass: 44px is a rule about
  //    thumbs, and applying it to a mouse pointer would bury the real findings.
  for (const el of minTouch ? document.querySelectorAll('button, a[href], input, select, [role="tab"]') : []) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.disabled || el.type === 'hidden') continue;
    if (offCanvas(r) || decorative(el) || srOnly(r)) continue;
    if (r.height < minTouch - 0.5 || r.width < minTouch - 0.5) {
      problems.push({
        kind: 'touch-target',
        detail: `${label(el)} is ${Math.round(r.width)}×${Math.round(r.height)}`,
      });
    }
  }

  // 4. Controls clipped by an ancestor that hides its overflow.
  //
  // This is the check that was missing. A submenu on the client profile was
  // rendered inside a card with `overflow-hidden`, so three of its entries —
  // Lifestyle, Workout Log, Progress Analytics — were cut off and unreachable.
  // Nothing above catches it: the panel's own box sits inside the viewport, it
  // is not undersized, and the page does not scroll sideways. It just cannot
  // be seen, because an ancestor's overflow clips descendants regardless of
  // their z-index.
  //
  // Only INTERACTIVE elements, because a clipped control is unambiguously a
  // bug — you cannot click what is not painted — whereas clipping is the whole
  // point for the decorative blurred blobs the page headers use. Those are
  // pointer-events-none, which is the discriminator.
  for (const el of document.querySelectorAll('button, a[href], input, select')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (el.disabled || offCanvas(r) || decorative(el) || srOnly(r)) continue;
    if (getComputedStyle(el).pointerEvents === 'none') continue;

    // Stops at body: the document root is scrolled by the viewport, not by a
    // clip, and globals.css sets `overflow-x: clip` on html — so including it
    // reported every control below the fold as "cut off by body".
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const nr = n.getBoundingClientRect();
      // A scroll container is allowed to hold content beyond its box; that is
      // what scrolling is for. Only a container that CANNOT be scrolled to
      // reveal the control is hiding it for good.
      const scrollable = /auto|scroll/.test(cs.overflowX + cs.overflowY);
      if (scrollable) continue;
      if (r.bottom > nr.bottom + 0.5 || r.top < nr.top - 0.5
        || r.right > nr.right + 0.5 || r.left < nr.left - 0.5) {
        problems.push({
          kind: 'clipped',
          detail: `${label(el)} is cut off by ${label(n).split(' "')[0]}`,
        });
        break;
      }
    }
  }

  return problems;
};

// ── Main ────────────────────────────────────────────────────────────────────

/**
 * Findings that are real but belong to shared chrome, not the workout module.
 *
 * They are NOT suppressed — they still print, under their own heading — but
 * they do not fail the run, because otherwise the check can never be green and
 * a genuinely new regression hides in a list of eleven expected lines.
 *
 * Every entry names what it is and why it is parked. Adding to this list is a
 * decision to defer a defect; it should read like one.
 */
const KNOWN = [
  // AppShell top bar and skip link. Present on all ~90 routes in the app, so
  // resizing them is an app-wide change, not a workout-module one.
  [/^a\.skip-link/, 'AppShell skip link — app-wide'],
  [/^button\.menu-toggle/, 'AppShell drawer toggle — app-wide'],
  [/^button\.flex\.h-9 is 32×32$/, 'AppShell top-bar icon button — app-wide'],
  [/^button\.flex\.h-8 is 28×28$/, 'AppShell top-bar icon button — app-wide'],
  [/^button\.relative\.flex is 28×28$/, 'AppShell top-bar icon button — app-wide'],
  [/^button\.flex\.items-center "61619 Fitness/, 'AppShell org switcher — app-wide'],
  [/^button\.absolute\.right-4 "Close"/, 'shared ui/dialog close button — app-wide'],

  // The Programs list page predates the redesign and styles its buttons with
  // the shared .btn-xs/.btn-sm classes from globals.css, which are 28px and
  // 32px by definition. Changing those heights changes every button in the
  // product, which is the user's call and not this pass's.
  [/"(Edit|Delete|Assign|New Plan|Enroll in PT|Renew PT)"/, 'shared .btn-* sizes — app-wide'],
  [/"(Active Plans|Exercise Library|AI Suggestions)/, 'Programs list tab strip — shared styles'],
  [/^button is 32×26$/, 'Programs list grid/list toggle — pre-existing'],
  [/"(Try again|Back to app|Retry)"/, 'error-boundary buttons — shared component'],
  [/^button\.group\.inline-flex "c-1"/, 'client-profile copy-id chip — pre-existing'],
  [/^a\.inline-flex\.items-center "(\+91|WhatsApp)/, 'client-profile contact links — pre-existing'],

  // Decorative blurred gradient blobs behind the page headers. They are
  // pointer-events-none and clipped by the page, so they overflow visually
  // by design.
  [/^div\.pointer-events-none\.absolute/, 'decorative background blob — intentional'],
];

const knownReason = (detail) => KNOWN.find(([re]) => re.test(detail))?.[1] ?? null;

const missingApi = new Set();
const knownSeen = new Set();
const findings = [];

async function main() {
  await assertPortFree();
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  // --no-build reuses the last build. Only safe when that build was made by
  // this script, because NEXT_PUBLIC_API_URL is baked in at build time — a
  // build from `npm run build` points at a different origin and every fetch
  // would escape the interceptor.
  if (args.includes('--no-build')) {
    console.log('reusing the existing build (--no-build)');
  } else {
    console.log(`building with NEXT_PUBLIC_API_URL=${ORIGIN} …`);
    await run('npx', ['next', 'build', '--webpack'], { NEXT_PUBLIC_API_URL: ORIGIN });
  }

  // JWT_SECRET is removed on purpose: with it set, the edge guard verifies the
  // signature and FAKE_TOKEN is rejected, sending every route to /login.
  const serverEnv = { ...process.env, NEXT_PUBLIC_API_URL: ORIGIN };
  delete serverEnv.JWT_SECRET;

  // detached, so the whole process group can be signalled. `npx next start`
  // forks a next-server child; killing the npx wrapper alone leaves that child
  // holding the port, and the NEXT run then fails the guard above. Every run
  // orphaned a server until this was fixed.
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    stdio: 'ignore',
    env: serverEnv,
    detached: true,
  });

  try {
    await waitForServer();
    const browser = await chromium.launch();

    for (const vp of VIEWPORTS) {
    for (const theme of themes) {
      for (const [name, route, open] of ROUTES) {
        if (only && !route.startsWith(only)) continue;

        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 2,
          isMobile: vp.touch,
          hasTouch: vp.touch,
          colorScheme: theme,
        });
        await ctx.addCookies([{
          name: 'token', value: FAKE_TOKEN, domain: 'localhost', path: '/',
        }]);
        // AppShell reads the theme from localStorage on mount; setting the
        // attribute too avoids a first-paint flash in the screenshot.
        await ctx.addInitScript((t) => {
          try { localStorage.setItem('619-theme', t); localStorage.setItem('theme', t); } catch { /* opaque origin */ }
          // Init scripts run at document-start, before the document element
          // exists, so applying the attribute has to wait for it. Doing it
          // eagerly throws once per navigation and drowns the page-error report.
          const apply = () => {
            const el = document.documentElement;
            if (!el) return;
            el.setAttribute('data-theme', t);
            el.classList.toggle('dark', t === 'dark');
          };
          apply();
          document.addEventListener('DOMContentLoaded', apply);
        }, theme);

        const page = await ctx.newPage();

        // In-flight API calls, so the run can wait for the page to finish
        // loading its data without depending on the network going quiet.
        let inflight = 0;
        let lastSettled = Date.now();

        await page.route('**/api/**', async (route_) => {
          inflight++;
          const url = new URL(route_.request().url());
          const body = resolveFixture(url.pathname, url.search);
          try {
            if (body === null) {
              missingApi.add(url.pathname);
              return await route_.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            }
            return await route_.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(body),
            });
          } finally {
            inflight--;
            lastSettled = Date.now();
          }
        });

        /** Resolve once no API call has been in flight for 600ms. */
        const waitForApiQuiet = async (capMs = 10_000) => {
          // A beat first: immediately after goto nothing has been requested
          // yet, and inflight === 0 would read as "finished loading".
          await page.waitForTimeout(500);
          const deadline = Date.now() + capMs;
          for (;;) {
            if (inflight === 0 && Date.now() - lastSettled > 600) return;
            if (Date.now() > deadline) return;
            await page.waitForTimeout(100);
          }
        };

        const consoleErrors = [];
        page.on('pageerror', (e) => consoleErrors.push(String(e)));

        // Not `waitUntil: 'networkidle'`. http.ts renews the session on an
        // interval, so the network never goes idle and every route times out.
        // Wait on the thing we actually care about instead: the page's own API
        // calls finishing, tracked by the route handler above.
        await page.goto(ORIGIN + route, { waitUntil: 'domcontentloaded' });
        await waitForApiQuiet();
        // Then let the entry animations settle, so the screenshot is the
        // resting state and not a frame of framer-motion mid-transition.
        await page.waitForTimeout(900);

        if (open) {
          // A state that cannot be opened is a finding in itself — the control
          // is missing, renamed, or covered — so record it rather than skip.
          try {
            await open(page);
            await waitForApiQuiet();
            await page.waitForTimeout(400);
          } catch (e) {
            consoleErrors.push(`could not reach this state: ${String(e).split('\n')[0]}`);
          }
        }

        // A page that redirects (Guard bouncing a role, a router.replace on
        // load) destroys the execution context mid-evaluate. Retry once after
        // it settles, and record where it ended up — landing somewhere else is
        // itself worth knowing, since the screenshot will not be the route.
        let problems = null;
        for (let attempt = 0; attempt < 3 && problems === null; attempt++) {
          try {
            problems = await page.evaluate(AUDIT, { width: vp.width, minTouch: vp.touch ? MIN_TOUCH : 0 });
          } catch {
            await page.waitForTimeout(1200);
          }
        }
        if (problems === null) {
          problems = [];
          consoleErrors.push('audit could not run: the page kept navigating');
        }

        const landed = new URL(page.url()).pathname + new URL(page.url()).search;
        const expected = route.split('?')[0];
        if (!landed.startsWith(expected)) {
          problems.push({ kind: 'redirected', detail: `expected ${route}, landed on ${landed}` });
        }

        const file = path.join(OUT_DIR, `${name}-${vp.name}-${theme}.png`);
        await page.screenshot({ path: file, fullPage: true });

        for (const p of problems) p.known = knownReason(p.detail);
        const live = problems.filter((p) => !p.known);
        problems.forEach((p) => { if (p.known) knownSeen.add(p.known); });

        if (problems.length || consoleErrors.length) {
          findings.push({ name, theme, vp: vp.name, problems, live, consoleErrors });
        }
        const failing = live.length || consoleErrors.length;
        console.log(
          `${failing ? '✗' : '✓'} ${name} (${vp.name}/${theme})`
          + `${live.length ? ` — ${live.length} problem(s)` : ''}`
          + `${consoleErrors.length ? ` — ${consoleErrors.length} page error(s)` : ''}`
          + `${problems.length - live.length ? ` (+${problems.length - live.length} known)` : ''}`,
        );

        await ctx.close();
      }
    }
    }

    await browser.close();
  } finally {
    // Negative pid = the whole group, which is the point of `detached` above.
    try { process.kill(-server.pid, 'SIGTERM'); } catch { server.kill(); }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\nscreenshots: ${OUT_DIR}`);

  if (missingApi.size) {
    console.log('\nAPI paths with no fixture (screens may be showing empty states):');
    [...missingApi].sort().forEach((p) => console.log(`  ${p}`));
  }

  if (knownSeen.size) {
    console.log('\nknown and deferred, not failing the run:');
    [...knownSeen].sort().forEach((r) => console.log(`  ${r}`));
  }

  const failing = findings.filter((f) => f.live.length || f.consoleErrors.length);
  if (!failing.length) {
    console.log('\nno overflow, no undersized touch targets, no page errors '
      + 'outside the deferred list above.');
    return;
  }

  console.log('\n── findings ───────────────────────────────────────────────');
  for (const f of failing) {
    console.log(`\n${f.name} (${f.vp}/${f.theme})`);
    // Identical overflows repeat down a list of cards; collapse them so the
    // report names each defect once rather than once per row.
    const seen = new Map();
    for (const p of f.live) {
      // Digits are stripped only for overflow, where the coordinates differ
      // per row and the defect is the same. Doing it for touch targets as well
      // collapsed `.h-11 is 39×39` and `.h-9 is 32×32` onto one key — the
      // first line seen won, and 24 undersized buttons were reported as 2.
      const key = p.kind === 'element-overflow'
        ? `${p.kind}|${p.detail.replace(/-?\d+/g, '#')}`
        : `${p.kind}|${p.detail}`;
      seen.set(key, (seen.get(key) ?? { ...p, count: 0 }));
      seen.get(key).count++;
    }
    for (const p of seen.values()) {
      console.log(`  [${p.kind}] ${p.detail}${p.count > 1 ? `  (×${p.count})` : ''}`);
    }
    // One line per DISTINCT error. A single broken effect fires on every
    // render and would otherwise bury the layout findings under fifty copies.
    const errs = new Map();
    for (const e of f.consoleErrors) {
      const first = e.split('\n')[0];
      errs.set(first, (errs.get(first) ?? 0) + 1);
    }
    for (const [e, n] of errs) console.log(`  [page-error] ${e}${n > 1 ? `  (×${n})` : ''}`);
  }
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
