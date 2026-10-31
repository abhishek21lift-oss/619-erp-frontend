import { HOME_FAQ } from '@/components/landing/faq-content';
import { SITE_URL } from '@/lib/seo-routes';
import {
  ORGANIZATION_ID,
  ORGANIZATION_NODE,
  SOFTWARE_ID,
  SITE_DESCRIPTION,
  WEBSITE_ID,
  WEBSITE_NODE,
  toJsonLd,
} from '@/lib/schema-org';

const WEBPAGE_ID = `${SITE_URL}/#webpage`;

/**
 * Schema.org description of the homepage. The FAQ is built from the same array
 * the accordion renders, so the markup cannot describe answers that are not on
 * the page. Everything else stays in sync with the page's `metadata` by hand.
 *
 * Organization and WebSite come from lib/schema-org.ts so every public page
 * that repeats them describes the same entity.
 */
export const HOME_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    ORGANIZATION_NODE,
    WEBSITE_NODE,
    {
      '@type': 'SoftwareApplication',
      '@id': SOFTWARE_ID,
      name: 'MY PT STUDIO',
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

export const HOME_STRUCTURED_DATA_JSON = toJsonLd(HOME_STRUCTURED_DATA);
