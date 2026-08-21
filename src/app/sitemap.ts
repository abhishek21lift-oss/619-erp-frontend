import type { MetadataRoute } from 'next';

/**
 * sitemap.xml.
 *
 * A sitemap is a list of URLs the site WANTS indexed, so every entry must be a
 * URL that actually permits indexing. The previous version listed `/login` at
 * priority 0.8 — a sign-in form, disallowed in robots.txt and carrying a
 * `noindex` meta tag. Listing it asked crawlers to index a page that three
 * other signals told them to leave alone.
 *
 * These two entries are exactly the two routes that opt in to indexing:
 *
 *   /            src/app/(chrome)/page.tsx
 *   /start-free  src/app/(bare)/start-free/layout.tsx
 *
 * publicRoutes.seo.test.ts asserts the three lists agree, so a URL cannot
 * appear here without the metadata that makes it indexable.
 */

const BASE = 'https://myptstudio.com';

/** Kept in one place so the SEO test can compare it against the opt-ins. */
export const PUBLIC_ROUTES = ['/', '/start-free'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: BASE, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/start-free`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
