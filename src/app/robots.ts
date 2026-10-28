import type { MetadataRoute } from 'next';
import { PUBLIC_SEO_ROUTES, SITE_URL } from '@/lib/seo-routes';

/** Authenticated URL segments that crawlers should not fetch. */
const PRIVATE_SEGMENTS = [
  '/ai',
  '/ai-coach',
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
  '/platform',
  '/platform-login',
  '/reports',
  '/reset-password',
  '/sales',
  '/settings',
  '/subscription',
  '/support',
  '/trainer',
  '/training',
];

/**
 * Private subtrees under a public parent.
 *
 * `/pt-os` itself is the public marketing page; `/pt-os/` is the authenticated
 * app. robots.txt matches by prefix, so this blocks `/pt-os/clients`,
 * `/pt-os/exercise-library`, `/pt-os/workout-plans` and the rest without
 * touching the exact public URL.
 */
const PRIVATE_PREFIXES = ['/pt-os/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [...PUBLIC_SEO_ROUTES],
        disallow: ['/api/', '/login', ...PRIVATE_SEGMENTS, ...PRIVATE_PREFIXES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

export { PRIVATE_SEGMENTS, PRIVATE_PREFIXES };
