import { HOME_FAQ } from '@/components/landing/faq-content';
import { SITE_URL } from '@/lib/seo-routes';

const SITE_NAME = 'MY PT STUDIO';
const SITE_DESCRIPTION =
  'MY PT STUDIO — the business management platform for personal trainers. Clients, training, nutrition, progress, payments and analytics, beautifully unified.';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const SOFTWARE_ID = `${SITE_URL}/#software`;
const WEBPAGE_ID = `${SITE_URL}/#webpage`;

/**
 * Schema.org description of the homepage. The FAQ is built from the same array
 * the accordion renders, so the markup cannot describe answers that are not on
 * the page. Everything else stays in sync with the page's `metadata` by hand.
 */
export const HOME_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
      description: SITE_DESCRIPTION,
    },
    {
      '@type': 'WebSite',
      '@id': WEBSITE_ID,
      url: SITE_URL,
      name: SITE_NAME,
      inLanguage: 'en',
      publisher: { '@id': ORGANIZATION_ID },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': SOFTWARE_ID,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { '@id': ORGANIZATION_ID },
    },
    {
      '@type': 'WebPage',
      '@id': WEBPAGE_ID,
      url: SITE_URL,
      name: 'MY PT STUDIO — Personal Training Business Management',
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': SOFTWARE_ID },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1'],
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: HOME_FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
} as const;

// JSON.stringify leaves `<` alone, so a future FAQ edit containing `</script>`
// could close this block early. Escape it; the escape is still valid JSON.
export const HOME_STRUCTURED_DATA_JSON = JSON.stringify(HOME_STRUCTURED_DATA).replace(/</g, '\\u003c');
