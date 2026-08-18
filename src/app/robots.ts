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
    sitemap: 'https://myptstudio.com/sitemap.xml',
  };
}
