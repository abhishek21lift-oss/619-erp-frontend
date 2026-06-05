import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/finance', '/members', '/sales', '/settings', '/clients'],
      },
    ],
    sitemap: 'https://619fitness.in/sitemap.xml',
  };
}
