import { SITE_URL } from '@/lib/seo-routes';
import { ORGANIZATION_NODE, WEBSITE_ID, WEBSITE_NODE, toJsonLd } from '@/lib/schema-org';

const PAGE_URL = `${SITE_URL}/start-free`;
const PAGE_ID = `${PAGE_URL}#webpage`;
const DESCRIPTION =
  'Start a free MY PT STUDIO trial — clients, training, nutrition, progress, payments and analytics for personal trainers, in one place.';

export const START_FREE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    ORGANIZATION_NODE,
    WEBSITE_NODE,
    {
      '@type': 'WebPage',
      '@id': PAGE_ID,
      url: PAGE_URL,
      name: 'Start Free — Personal Trainer Software',
      description: DESCRIPTION,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      breadcrumb: { '@id': `${PAGE_URL}#breadcrumb` },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Start Free', item: PAGE_URL },
      ],
    },
  ],
} as const;

export const START_FREE_STRUCTURED_DATA_JSON = toJsonLd(START_FREE_STRUCTURED_DATA);
