import { HOME_FAQ } from '@/components/landing/faq-content';
import type { PublicPlan } from '@/components/landing/types';
import { SITE_URL } from '@/lib/seo-routes';
import {
  ORGANIZATION_ID,
  ORGANIZATION_NODE,
  SOFTWARE_ID,
  SITE_DESCRIPTION,
  SOFTWARE_FEATURES,
  WEBSITE_ID,
  WEBSITE_NODE,
} from '@/lib/schema-org';

const WEBPAGE_ID = `${SITE_URL}/#webpage`;

export type PlanOffer = {
  '@type': 'Offer';
  name: string;
  price: number;
  priceCurrency: 'INR';
  description: string;
  url: string;
};

export function buildPlanOffers(plans: readonly PublicPlan[]): PlanOffer[] {
  return plans.map((plan) => ({
    '@type': 'Offer',
    name: plan.name,
    price: plan.effective_price_inr,
    priceCurrency: 'INR',
    description: `${plan.duration_months}-month plan`,
    url: `${SITE_URL}/#pricing`,
  }));
}

/**
 * Schema.org description of the homepage. The FAQ is built from the same array
 * the accordion renders, so the markup cannot describe answers that are not on
 * the page. Everything else stays in sync with the page's `metadata` by hand.
 *
 * Organization and WebSite come from lib/schema-org.ts so every public page
 * that repeats them describes the same entity. Offers are passed in from the
 * live plan payload; no plans means no `offers` key at all.
 */
export function buildHomeStructuredData(offers: readonly PlanOffer[] = []) {
  return {
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
        featureList: SOFTWARE_FEATURES,
        ...(offers.length > 0 ? { offers } : {}),
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
  };
}

export const HOME_STRUCTURED_DATA = buildHomeStructuredData();
