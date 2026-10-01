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
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_SEO_ROUTES.map((route) => ({
    url: canonicalUrl(route),
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: PRIORITY[route],
  }));
}
