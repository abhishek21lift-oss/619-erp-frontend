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
  '/pt-os',
  '/reports',
  '/reset-password',
  '/sales',
  '/settings',
  '/sign',
  '/subscription',
  '/support',
  '/trainer',
  '/training',
];

/** Answer-engine crawlers that should see the same public surface as `*`. */
export const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  const allow = [...PUBLIC_SEO_ROUTES];
  const disallow = ['/api/', '/login', ...PRIVATE_SEGMENTS];
  return {
    rules: [
      {
        userAgent: '*',
        allow,
        disallow,
      },
      {
        userAgent: AI_CRAWLERS,
        allow,
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

export { PRIVATE_SEGMENTS };
