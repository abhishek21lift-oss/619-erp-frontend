import type { MetadataRoute } from 'next';

/** Authenticated URL segments that crawlers should not fetch. */
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
  '/platform',
  '/platform-login',
  // Do NOT disallow /pt-os: its exact path is a public marketing page.
  // Authenticated PT OS sub-routes are covered by their own exact/private
  // segments below rather than by a parent-prefix disallow.
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
        allow: ['/', '/pt-os'],
        disallow: ['/api/', '/login', ...PRIVATE_SEGMENTS],
      },
    ],
    sitemap: 'https://myptstudio.com/sitemap.xml',
  };
}

export { PRIVATE_SEGMENTS };
