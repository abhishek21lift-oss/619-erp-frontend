import type { MetadataRoute } from 'next';

/**
 * robots.txt.
 *
 * ── What this is and is not ─────────────────────────────────────────────────
 *
 * A `Disallow` here asks a crawler not to FETCH a path. It is not a way to
 * keep a page out of an index — a disallowed URL can still be listed from
 * other signals, and a crawler that cannot fetch the page also cannot see the
 * `noindex` meta tag on it. The meta tag is what actually keeps these routes
 * out of search, and it is applied by default in src/app/layout.tsx to every
 * route on the origin. This file is the second, weaker layer: it keeps
 * crawlers off the authenticated surface so they do not spend the site's
 * crawl budget on pages that will only redirect them to a sign-in form.
 *
 * ── What was wrong before ───────────────────────────────────────────────────
 *
 * The previous list was `/api/, /finance, /members, /sales, /settings,
 * /clients`. Two of those six are not routes:
 *
 *   /members   does not exist — the member area is /member (singular)
 *   /clients   does not exist at the top level — it is /pt-os/clients
 *
 * so a third of the list protected nothing, and roughly twenty real
 * authenticated segments were absent from it entirely.
 *
 * ── How this list is kept honest ────────────────────────────────────────────
 *
 * publicRoutes.seo.test.ts reads the route tree from disk and asserts that
 * every top-level segment is either listed below or named as public. A new
 * area added to the app fails that test until it is classified, rather than
 * being silently crawlable.
 */

/** Top-level URL segments that require a session, or exist only mid-flow. */
const PRIVATE_SEGMENTS = [
  '/admin',
  '/ai',
  '/ai-coach',
  '/appointments',
  '/attendance',
  '/auth',
  '/checkin',
  '/client',
  '/engagement',
  '/finance',
  '/forgot-password',
  '/help',
  '/insights',
  '/member',
  '/member-login',
  '/operations',
  '/pay',
  // The Command Center. Served on its own hostname in production (see
  // src/proxy.ts), but the route exists on this origin too and is the highest-
  // privilege surface in the product. It was missing from the first draft of
  // this list, and publicRoutes.seo.test.ts is what noticed.
  '/platform',
  '/platform-login',
  '/pt-os',
  '/reports',
  '/reset-password',
  '/sales',
  '/settings',
  '/subscription',
  '/support',
  '/trainer',
  '/trainers',
  '/training',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // `/login` is disallowed alongside the app itself. It is a sign-in
        // form: there is nothing on it to rank, and it was previously being
        // advertised in sitemap.xml at priority 0.8 while the origin's own
        // meta tag told crawlers not to index it.
        disallow: ['/api/', '/login', ...PRIVATE_SEGMENTS],
      },
    ],
    sitemap: 'https://myptstudio.com/sitemap.xml',
  };
}

export { PRIVATE_SEGMENTS };
