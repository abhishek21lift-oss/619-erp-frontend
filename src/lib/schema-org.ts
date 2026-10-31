// Shared schema.org nodes — one identity per entity across every public page.
//
// Organization and WebSite are declared on each page that carries structured
// data, but they must describe the SAME entity. Repeating them from here keeps
// the `@id` values identical: a crawler merges nodes by `@id`, so two spellings
// of the organization would read as two organizations.

import { SITE_URL } from '@/lib/seo-routes';

export const SITE_NAME = 'MY PT STUDIO';
export const SITE_DESCRIPTION =
  'MY PT STUDIO — the business management platform for personal trainers. Clients, training, nutrition, progress, payments and analytics, beautifully unified.';

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;

export const ORGANIZATION_NODE = {
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description: SITE_DESCRIPTION,
} as const;

export const WEBSITE_NODE = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: SITE_URL,
  name: SITE_NAME,
  inLanguage: 'en',
  publisher: { '@id': ORGANIZATION_ID },
} as const;

// JSON.stringify leaves `<` alone, so content containing `</script>` could
// close the block early. Escape it; the escape is still valid JSON.
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
