// The public SEO route contract — the one list every crawler-facing surface
// reads from.
//
// Exactly these URLs are indexable: each answers 200 with its own HTML, opts
// in with `robots: { index: true, follow: true }`, declares itself canonical,
// is listed in the sitemap, and is allowed by robots.txt. Everything else on
// the origin inherits the root layout's `noindex, nofollow` default and is
// never sitemap-listed.
//
// Before this file the list was written out separately in sitemap.ts,
// robots.ts and the proxy's sessionless pages, and the copies drifted: the
// sitemap advertised /pt-os and its page declared itself canonical, while
// next.config.js 308-redirected it to / — so the URL search engines were
// invited to was one they could never reach. publicRoutes.seo.test.ts holds
// every surface to this list.

/** The canonical origin. Matches `metadataBase` in the root layout. */
export const SITE_URL = 'https://myptstudio.com';

/** Every indexable route, by pathname. Order is the sitemap's order. */
export const PUBLIC_SEO_ROUTES = ['/', '/pt-os', '/start-free'] as const;

export type PublicSeoRoute = (typeof PUBLIC_SEO_ROUTES)[number];

/**
 * The absolute URL Next emits for a route's `alternates.canonical`, resolved
 * against `metadataBase`. The root is emitted without a trailing slash, so the
 * sitemap uses the same spelling and the two can be compared as strings.
 */
export function canonicalUrl(route: PublicSeoRoute): string {
  return route === '/' ? SITE_URL : `${SITE_URL}${route}`;
}

export function isPublicSeoRoute(pathname: string): boolean {
  return (PUBLIC_SEO_ROUTES as readonly string[]).includes(pathname);
}
