// The public SEO route contract — the one list every crawler-facing surface
// reads from.
//
// Exactly these URLs are indexable: each answers 200 with its own HTML, opts
// in with `robots: { index: true, follow: true, 'max-snippet': -1,
// 'max-image-preview': 'large' }`, declares itself canonical, is listed in the
// sitemap, and is allowed by robots.txt. Everything else on the origin
// inherits the root layout's `noindex, nofollow` default and is never
// sitemap-listed.
//
// The product now opens on the unified sign-in form, so the old public
// landing pages (`/` and `/pt-os`) are private dashboards. Start Free is the
// only page a crawler is invited to, because it is the only one a person with
// no account can act on.

/** The canonical origin. Matches `metadataBase` in the root layout. */
export const SITE_URL = 'https://myptstudio.com';

/** Every indexable route, by pathname. Order is the sitemap's order. */
export const PUBLIC_SEO_ROUTES = ['/start-free'] as const;

export type PublicSeoRoute = (typeof PUBLIC_SEO_ROUTES)[number];

/**
 * The absolute URL Next emits for a route's `alternates.canonical`, resolved
 * against `metadataBase`.
 */
export function canonicalUrl(route: PublicSeoRoute): string {
  return `${SITE_URL}${route}`;
}

export function isPublicSeoRoute(pathname: string): boolean {
  return (PUBLIC_SEO_ROUTES as readonly string[]).includes(pathname);
}
