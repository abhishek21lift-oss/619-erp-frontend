import type { MetadataRoute } from 'next';
import { PUBLIC_SEO_ROUTES, canonicalUrl, type PublicSeoRoute } from '@/lib/seo-routes';

/** Public marketing routes that explicitly opt in to indexing. */
export const PUBLIC_ROUTES = PUBLIC_SEO_ROUTES;

const PRIORITY: Record<PublicSeoRoute, number> = {
  '/': 1,
  '/pt-os': 0.9,
  '/start-free': 0.8,
};

// Only the canonical URL of each public route — never a redirect, a private
// route or a second spelling of the same page.
//
// No `lastModified`: it used to be `new Date()` on every request, so the
// sitemap claimed all three pages changed at the moment it was fetched. A
// lastmod that is always "now" is ignored by Google at best and mistrusted at
// worst; the crawl data is a better signal until a real content date exists.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_SEO_ROUTES.map((route) => ({
    url: canonicalUrl(route),
    changeFrequency: 'monthly' as const,
    priority: PRIORITY[route],
  }));
}
