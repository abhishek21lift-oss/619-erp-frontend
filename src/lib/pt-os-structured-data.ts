import { PT_OS_FAQ } from '@/components/landing/pt-os-faq-content';
import { SITE_URL } from '@/lib/seo-routes';
import {
  ORGANIZATION_ID,
  ORGANIZATION_NODE,
  SOFTWARE_FEATURES,
  SOFTWARE_ID,
  SITE_NAME,
  WEBSITE_ID,
  WEBSITE_NODE,
  toJsonLd,
} from '@/lib/schema-org';

const PAGE_URL = `${SITE_URL}/pt-os`;
const PAGE_ID = `${PAGE_URL}#webpage`;

const DESCRIPTION =
  'PT OS helps Indian personal trainers run clients, programmes, sessions, payments and renewals in one workspace. Start free today.';

/**
 * Schema.org description of `/pt-os`.
 *
 * The FAQ is built from the same array the accordion renders. The breadcrumb
 * matches the one visible path to this page (`/` → `/pt-os`). The SoftwareApplication
 * reuses the homepage's `@id`, so both URLs describe one product rather than two.
 */
export const PT_OS_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    ORGANIZATION_NODE,
    WEBSITE_NODE,
    {
      '@type': 'SoftwareApplication',
      '@id': SOFTWARE_ID,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: PAGE_URL,
      description: DESCRIPTION,
      publisher: { '@id': ORGANIZATION_ID },
      featureList: SOFTWARE_FEATURES,
    },
    {
      '@type': 'WebPage',
      '@id': PAGE_ID,
      url: PAGE_URL,
      name: 'PT OS: Personal Trainer Software for India',
      description: DESCRIPTION,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': SOFTWARE_ID },
      breadcrumb: { '@id': `${PAGE_URL}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'PT OS', item: PAGE_URL },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${PAGE_URL}#faq`,
      mainEntity: PT_OS_FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
} as const;

export const PT_OS_STRUCTURED_DATA_JSON = toJsonLd(PT_OS_STRUCTURED_DATA);
