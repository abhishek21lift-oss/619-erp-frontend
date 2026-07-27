/**
 * Security headers — the single source of truth for the whole app.
 *
 * CommonJS on purpose: next.config.js requires this at build time, and that
 * file cannot import TypeScript.
 *
 * WHY HERE AND NOT IN THE MIDDLEWARE
 * These headers used to be set in src/proxy.ts. That covered pages and missed
 * everything else, because its matcher deliberately excludes `api`,
 * `_next/static`, `_next/image`, favicon and every image/font extension — so
 * API responses (which in production are rewritten straight through to the
 * Express backend) and every static asset shipped with no security headers at
 * all, HSTS included. A middleware matcher cannot express "everything";
 * next.config.js headers() can, and applies to rewritten paths too.
 *
 * There is exactly one place that sets these. Do not re-add them to proxy.ts
 * or vercel.json — a middleware headers.set() silently wins over this file and
 * leaves a second copy to rot, which is how the two drifted before.
 */

'use strict';

// Hosts the app legitimately talks to. Derived from env so a deploy pointing
// at a different backend does not need a code change — and so a missing var
// produces a tighter policy rather than a wildcard.
function originOf(url) {
  if (!url) return '';
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

function hostOf(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Build the Content-Security-Policy.
 *
 * Exported separately so it can be unit-tested: a CSP is a string that silently
 * breaks the app in production if a directive is wrong, and it is the one
 * header here with real logic in it.
 */
function buildCsp(env = process.env, opts = {}) {
  const supabaseHost = hostOf(env.NEXT_PUBLIC_SUPABASE_URL) || '*.supabase.co';
  const apiOrigin = originOf(env.NEXT_PUBLIC_API_URL);
  const apiConnect = apiOrigin ? ` ${apiOrigin}` : '';

  // With a nonce, script-src trades 'unsafe-inline' for the nonce itself —
  // Next.js stamps its own hydration scripts with it, and the app no longer
  // has any inline script of its own (the theme bootstrap moved to
  // /theme-init.js). Everything else in the policy is identical, so a
  // violation reported under the nonce policy is unambiguously about inline
  // script and nothing else.
  const scriptSrc = opts.nonce
    ? `script-src 'self' 'nonce-${opts.nonce}' https://accounts.google.com/gsi/ https://cdnjs.cloudflare.com`
    : null;

  return [
    "default-src 'self'",

    // 'unsafe-eval' was removed after verifying in a real Chromium that the
    // app raises zero securitypolicyviolation events without it and still
    // mounts — it had no consumer, it was inherited boilerplate. Do not add it
    // back to make a library work; find the library that calls eval instead.
    //
    // 'unsafe-inline' remains, and is now the single biggest weakness here. It
    // is required by the theme bootstrap script in app/layout.tsx, which must
    // run before first paint to avoid a flash of the wrong theme, and by
    // Next.js's own hydration scripts. Replacing it needs a per-request nonce
    // — tracked separately, and being measured first via the Report-Only
    // policy below.
    //
    // cdnjs serves SheetJS, which lib/sheet-import.ts injects as a script tag
    // (with SRI) on first use of the spreadsheet importer.
    scriptSrc || "script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/ https://cdnjs.cloudflare.com",

    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/",
    `img-src 'self' data: blob: https://${supabaseHost} https://lh3.googleusercontent.com`,
    `connect-src 'self' https://${supabaseHost}${apiConnect} https://accounts.google.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://accounts.google.com",

    // 'none', not 'self': this app is never framed, and the previous 'self'
    // quietly contradicted X-Frame-Options: DENY. Modern browsers prefer
    // frame-ancestors, so the weaker of the two was the one taking effect.
    "frame-ancestors 'none'",

    // No <object>/<embed>/<applet>. Covered by default-src, but stated
    // explicitly because plugin content is a classic XSS bypass and reviewers
    // look for this directive by name.
    "object-src 'none'",

    "base-uri 'self'",
    "form-action 'self'",

    // Rewrite any stray http:// subresource to https:// instead of letting the
    // browser block it as mixed content. A safety net, not a licence to ship
    // http URLs.
    'upgrade-insecure-requests',
  ].join('; ');
}

/**
 * HSTS. Only ever emitted in production.
 *
 * Sending this from a dev server would pin localhost to HTTPS in the
 * developer's browser for a year — a self-inflicted, hard-to-diagnose outage
 * that survives cache clears. `preload` is deliberately NOT set: it is a
 * one-way door (removal from the browser preload list takes months) and it
 * requires every subdomain to serve HTTPS, which is the owner's call to make
 * once they have verified that, not a default.
 */
const HSTS = 'max-age=31536000; includeSubDomains';

/**
 * @param {boolean} isProd
 * @param {NodeJS.ProcessEnv} env
 */
function securityHeaders(isProd, env = process.env) {
  const headers = [
    { key: 'Content-Security-Policy', value: buildCsp(env) },

    // Belt-and-braces with frame-ancestors above, for anything that predates
    // CSP support.
    { key: 'X-Frame-Options', value: 'DENY' },

    // Stop the browser guessing a content type. Without it, a JSON or text
    // response containing markup can be sniffed as HTML and executed.
    { key: 'X-Content-Type-Options', value: 'nosniff' },

    // Full URL to same-origin, origin only cross-origin. Keeps client ids and
    // record ids in our paths from leaking to third parties via Referer.
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

    // Camera stays enabled — the QR check-in scanner needs it. Everything else
    // is denied outright rather than left to the browser default.
    {
      key: 'Permissions-Policy',
      value: [
        'camera=(self)',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
        'interest-cohort=()',
      ].join(', '),
    },

    // The legacy XSS auditor is removed from Chrome and its filter introduced
    // XS-Leak bugs of its own. 0 disables it; this is the current OWASP
    // recommendation, and an explicit 0 beats omitting the header because it
    // overrides anything a proxy might inject.
    { key: 'X-XSS-Protection', value: '0' },

    // same-origin-allow-popups, NOT same-origin: Google Sign-In opens a popup
    // and talks back to it via window.opener. Plain 'same-origin' severs that
    // handle and breaks Google login outright.
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },

    // Our own responses are not for other origins to embed.
    { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },

    // Cross-Origin-Embedder-Policy is intentionally NOT set. 'require-corp'
    // would demand CORP/CORS headers on every cross-origin subresource, which
    // Google Sign-In's iframe and Supabase-hosted images do not send — it
    // would break login and avatars for a benefit (cross-origin isolation)
    // this app has no use for, since it uses neither SharedArrayBuffer nor
    // high-resolution timers.

    // Ask for a dedicated agent cluster so this origin cannot be reached via
    // document.domain from a sibling origin.
    { key: 'Origin-Agent-Cluster', value: '?1' },

    // Prefetching leaks which hosts a user is about to contact to their DNS
    // resolver before they have clicked anything.
    { key: 'X-DNS-Prefetch-Control', value: 'off' },

    // Blocks Adobe crossdomain.xml policies — legacy, but free to deny.
    { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  ];

  if (isProd) {
    headers.push({ key: 'Strict-Transport-Security', value: HSTS });
  }

  return headers;
}

/**
 * The candidate strict policy, as REPORT-ONLY.
 *
 * This is how 'unsafe-inline' gets removed without a silent production
 * outage. The enforced policy (above, from next.config.js) is unchanged and
 * still permits inline script, so nothing can break; this one runs alongside
 * it and only reports what WOULD have been blocked. When real traffic stops
 * producing violations, the same string can be promoted to the enforced
 * header and 'unsafe-inline' deleted.
 *
 * A CSP tightened by reasoning alone breaks in exactly the places nobody
 * tested. This measures instead.
 *
 * `reportUri` is optional: without it violations appear only in the browser
 * console and as securitypolicyviolation events. Sentry accepts CSP reports
 * at https://<host>/api/<project>/security/?sentry_key=<key> if you want them
 * collected centrally.
 */
function buildReportOnlyCsp(env, nonce, reportUri) {
  const csp = buildCsp(env, { nonce });
  return reportUri ? `${csp}; report-uri ${reportUri}` : csp;
}

module.exports = { securityHeaders, buildCsp, buildReportOnlyCsp, HSTS };
