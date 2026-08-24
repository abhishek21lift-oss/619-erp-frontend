import type { MetadataRoute } from 'next';

const BASE = 'https://myptstudio.com';

/** Public marketing routes that explicitly opt in to indexing. */
export const PUBLIC_ROUTES = ['/', '/start-free', '/pt-os'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: BASE, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/start-free`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/pt-os`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
  ];
}
