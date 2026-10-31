# GEO for AI Answer Engines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three public marketing routes legible and citable to AI answer engines without exposing any authenticated app data.

**Architecture:** Add a static `llms.txt`, an explicit AI-crawler rule group, and one consistent Organization/WebSite/product entity graph. On `/`, fetch the existing public plans/stats endpoints on the server for anonymous requests only, seed the client landing page with that data so prices and stats are in the initial HTML, and derive per-plan `Offer` nodes from the same live response. Keep every FAQ answer mounted so the HTML matches the FAQPage schema.

**Tech Stack:** Next.js 16 App Router (server components, `MetadataRoute.Robots`, `next.revalidate` fetch cache), React 19, TypeScript, Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-31-geo-ai-search-design.md`

## Global Constraints

- Exactly `/`, `/pt-os`, `/start-free` are indexable. Every other route stays `noindex, nofollow` and robots-disallowed.
- Never invent prices, ratings, addresses, social profiles or customer counts.
- `llms.txt` is a static file and is NOT added to `PUBLIC_SEO_ROUTES`.
- The server fetch runs only for anonymous requests, has a 2-second abort, `next: { revalidate: 300 }`, and never throws.
- Prices come only from `/api/public/plans`; when there are no plans, omit `offers` entirely rather than emitting an empty array or a made-up price.
- The three public `robots` metadata objects become `{ index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' }`.
- The root layout keeps `robots: { index: false, follow: false }`.
- No new dependencies. Keep the existing file structure, comments and naming.
- Work stays on `feat/seo-social-cards-schema`; `.worktrees/` is untracked and must not be touched.

## Review Focus

- Backend cold, slow or unreachable: `/` must still render; offers are absent, and the client fetch can fill prices in after hydration.
- `NEXT_PUBLIC_API_URL` unset: no server fetch, no crash, page renders as it does today.
- Empty plans array vs a zero-price plan: empty omits `offers`; a zero price is still a real `Offer`.
- Signed-in request at `/`: no server fetch at all, so the dashboard's TTFB is unchanged.
- Closed FAQ panel: answer stays in the DOM for crawlers but is `aria-hidden` and unreachable for screen readers until opened.

---

### Task 1: `llms.txt` and sessionless serving

**Files:**
- Create: `public/llms.txt`
- Modify: `src/proxy.ts:7-28`
- Test: `src/__tests__/publicRoutes.seo.test.ts`

**Interfaces:**
- Consumes: `PUBLIC_SEO_ROUTES`, `canonicalUrl`, `isPublicProxyPath`.
- Produces: a static `/llms.txt`; no exported symbols.

- [ ] **Step 1: Add the failing tests**

Append to `src/__tests__/publicRoutes.seo.test.ts`:

```ts
describe('llms.txt', () => {
  const file = path.join(__dirname, '..', '..', 'public', 'llms.txt');

  it('exists, names every public URL and states the trial and contact', () => {
    const txt = fs.readFileSync(file, 'utf8');
    for (const route of PUBLIC_SEO_ROUTES) expect(txt).toContain(canonicalUrl(route));
    expect(txt).toContain('7-day free trial');
    expect(txt).toContain('support@myptstudio.com');
  });

  it('is served without a session', () => {
    expect(isPublicProxyPath('/llms.txt')).toBe(true);
  });

  it('is not part of the indexable page contract', () => {
    expect(PUBLIC_SEO_ROUTES as readonly string[]).not.toContain('/llms.txt');
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts -t llms.txt`
Expected: FAIL with `ENOENT` for `public/llms.txt`.

- [ ] **Step 3: Create `public/llms.txt`**

```markdown
# MY PT STUDIO

> MY PT STUDIO is a business management platform for personal trainers and
> small studios. It brings clients, training, nutrition, progress, payments and
> analytics into one workspace, with AI assistance grounded in each client's own
> records.

## Who it is for

Personal trainers, fitness coaches and small studio owners, particularly in
India.

## What it does

- **Operate:** command dashboard, attendance and check-in, billing and
  collections, client lifecycle.
- **Train:** programmes and templates, exercise library, progress tracking.
- **Intelligence:** AI Coach, AI insights, knowledge base.
- **Engage:** WhatsApp outreach, campaigns and offers.
- **Grow:** finance and forecast, multi-branch.

## Pricing and trial

- 7-day free trial. No card required.
- Prices are in INR and are always shown live at https://myptstudio.com/#pricing.
- Plans differ by billing period and client limit. The live pricing section is
  the only authoritative price list.

## Public pages

- https://myptstudio.com/ — homepage and product overview
- https://myptstudio.com/pt-os — PT OS, personal trainer software for India
- https://myptstudio.com/start-free — start a free trial

## Contact

support@myptstudio.com

## Not for indexing

The authenticated application — paths under /pt-os/ such as /pt-os/clients, and
app routes such as /login, /client, /member, /trainer, /attendance, /finance and
/settings — is private. It holds client health, payment and business data. It is
disallowed in robots.txt; do not index or reproduce it.
```

- [ ] **Step 4: Add `/llms.txt` to `PUBLIC_ASSET_PREFIXES`**

In `src/proxy.ts`, add `'/llms.txt',` next to `'/sitemap.xml'` and `'/robots.txt'`.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts -t llms.txt`
Expected: 3 passing.

- [ ] **Step 6: Commit**

```bash
git add public/llms.txt src/proxy.ts src/__tests__/publicRoutes.seo.test.ts
git commit -m "feat(seo): add llms.txt and serve it without a session"
```

---

### Task 2: Explicit AI crawler policy

**Files:**
- Modify: `src/app/robots.ts:43-56`
- Test: `src/__tests__/publicRoutes.seo.test.ts`

**Interfaces:**
- Produces: exported `AI_CRAWLERS: string[]`.

- [ ] **Step 1: Add the failing tests**

Append inside the existing `describe('robots.txt describes routes that exist', ...)` block or as a sibling describe:

```ts
describe('AI crawler policy', () => {
  type Rule = { userAgent: string | string[]; allow?: string[]; disallow?: string[] };
  const rules = robots().rules as Rule[];

  it('keeps the wildcard rule first', () => {
    expect(rules[0].userAgent).toBe('*');
  });

  it('gives AI crawlers the same public allow-list as everyone else', () => {
    expect(rules).toHaveLength(2);
    expect(rules[1].userAgent).toEqual(AI_CRAWLERS);
    expect(rules[1].allow).toEqual([...PUBLIC_SEO_ROUTES]);
  });

  it('blocks the same private segments for AI crawlers', () => {
    expect(rules[1].disallow).toEqual(rules[0].disallow);
    expect(rules[1].disallow).toContain('/api/');
    expect(rules[1].disallow).toContain('/login');
    expect(rules[1].disallow).toContain('/pt-os/');
    expect(rules[1].disallow).not.toContain('/pt-os');
  });

  it('names the answer-engine crawlers the product wants to reach', () => {
    expect(AI_CRAWLERS).toEqual([
      'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
      'PerplexityBot', 'Perplexity-User',
      'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
      'Google-Extended', 'Applebot-Extended', 'CCBot',
    ]);
  });
});
```

Import `AI_CRAWLERS` from `@/app/robots` in the test's existing import line.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts -t "AI crawler policy"`
Expected: FAIL — `rules` has one element / `AI_CRAWLERS` is not exported.

- [ ] **Step 3: Add the rule group**

In `src/app/robots.ts`, export the list:

```ts
export const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot',
];
```

Build the two lists once and use them for both rules:

```ts
export default function robots(): MetadataRoute.Robots {
  const allow = [...PUBLIC_SEO_ROUTES];
  const disallow = ['/api/', '/login', ...PRIVATE_SEGMENTS, ...PRIVATE_PREFIXES];
  return {
    rules: [
      { userAgent: '*', allow, disallow },
      { userAgent: AI_CRAWLERS, allow, disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 4: Run the whole SEO test file**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts`
Expected: all passing, including the existing `rules[0]` assertions.

- [ ] **Step 5: Commit**

```bash
git add src/app/robots.ts src/__tests__/publicRoutes.seo.test.ts
git commit -m "feat(seo): add AI crawler rules to robots.txt"
```

---

### Task 3: Organization contact and shared feature list

**Files:**
- Modify: `src/lib/schema-org.ts`
- Modify: `src/lib/home-structured-data.ts:29-37`
- Modify: `src/lib/pt-os-structured-data.ts:31-40`
- Test: `src/__tests__/publicRoutes.seo.test.ts`

**Interfaces:**
- Consumes: `ORGANIZATION_NODE`, `SOFTWARE_FEATURES`.
- Produces: `SOFTWARE_FEATURES: readonly string[]`; both `SoftwareApplication` nodes gain `featureList`; `ORGANIZATION_NODE` gains `email` and `contactPoint`.

- [ ] **Step 1: Add the failing tests**

Append a new describe to `src/__tests__/publicRoutes.seo.test.ts`, importing `ORGANIZATION_NODE` and `SOFTWARE_FEATURES` from `@/lib/schema-org`:

```ts
describe('shared entity details', () => {
  it('states the real support contact without inventing an address', () => {
    expect(ORGANIZATION_NODE.email).toBe('support@myptstudio.com');
    expect(ORGANIZATION_NODE.contactPoint).toEqual({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@myptstudio.com',
    });
    expect(ORGANIZATION_NODE).not.toHaveProperty('address');
    expect(ORGANIZATION_NODE).not.toHaveProperty('sameAs');
  });

  it('lists every shipped product area once', () => {
    expect(SOFTWARE_FEATURES).toEqual([
      'Command dashboard',
      'Attendance & check-in',
      'Billing & collections',
      'Client lifecycle',
      'Programmes & templates',
      'Exercise library',
      'Progress tracking',
      'AI Coach',
      'AI insights',
      'Knowledge base',
      'WhatsApp outreach',
      'Campaigns & offers',
      'Finance & forecast',
      'Multi-branch',
    ]);
  });

  it('puts the same feature list on both SoftwareApplication nodes', () => {
    type SchemaNode = Record<string, unknown> & { '@type': string };
    for (const data of [HOME_STRUCTURED_DATA, PT_OS_STRUCTURED_DATA]) {
      const graph = data['@graph'] as readonly SchemaNode[];
      const app = graph.find((n) => n['@type'] === 'SoftwareApplication');
      expect(app?.featureList).toBe(SOFTWARE_FEATURES);
    }
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts -t "shared entity details"`
Expected: FAIL — `ORGANIZATION_NODE.email` is undefined; `SOFTWARE_FEATURES` is not exported.

- [ ] **Step 3: Implement the shared values**

In `src/lib/schema-org.ts`:

```ts
const SUPPORT_EMAIL = 'support@myptstudio.com';

export const SOFTWARE_FEATURES = [
  'Command dashboard',
  'Attendance & check-in',
  'Billing & collections',
  'Client lifecycle',
  'Programmes & templates',
  'Exercise library',
  'Progress tracking',
  'AI Coach',
  'AI insights',
  'Knowledge base',
  'WhatsApp outreach',
  'Campaigns & offers',
  'Finance & forecast',
  'Multi-branch',
] as const;
```

Add to `ORGANIZATION_NODE`:

```ts
email: SUPPORT_EMAIL,
contactPoint: {
  '@type': 'ContactPoint',
  contactType: 'customer support',
  email: SUPPORT_EMAIL,
},
```

Import `SOFTWARE_FEATURES` in both structured-data files and add `featureList: SOFTWARE_FEATURES` to their `SoftwareApplication` node.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema-org.ts src/lib/home-structured-data.ts src/lib/pt-os-structured-data.ts src/__tests__/publicRoutes.seo.test.ts
git commit -m "feat(seo): describe support contact and product features in schema"
```

---

### Task 4: Build homepage offers from live plans

**Files:**
- Modify: `src/lib/home-structured-data.ts`
- Modify: `src/app/(chrome)/page.tsx`
- Test: `src/__tests__/publicRoutes.seo.test.ts`

**Interfaces:**
- Consumes: `PublicPlan` (`@/components/landing/types`), `SOFTWARE_FEATURES`, `SITE_URL`.
- Produces:
  - `type PlanOffer = { '@type': 'Offer'; name: string; price: number; priceCurrency: 'INR'; description: string; url: string }`
  - `buildPlanOffers(plans: readonly PublicPlan[]): PlanOffer[]`
  - `buildHomeStructuredData(offers?: readonly PlanOffer[]): { '@context': string; '@graph': readonly unknown[] }`
  - `HOME_STRUCTURED_DATA = buildHomeStructuredData()`

- [ ] **Step 1: Add the failing tests**

Import `buildHomeStructuredData` and `buildPlanOffers` in the test, then add:

```ts
describe('homepage offers', () => {
  const plans: PublicPlan[] = [
    {
      code: 'starter', name: 'Starter', price_inr: 999, effective_price_inr: 899,
      is_launch: false, duration_months: 1, client_limit: 30, best_for: 'Solo trainers',
    },
    {
      code: 'growth', name: 'Growth', price_inr: 0, effective_price_inr: 0,
      is_launch: true, duration_months: 12, client_limit: null, best_for: null,
    },
  ];
  type SchemaNode = Record<string, unknown> & { '@type': string };
  const softwareNode = (data: ReturnType<typeof buildHomeStructuredData>) =>
    (data['@graph'] as readonly SchemaNode[])
      .find((n) => n['@type'] === 'SoftwareApplication') as Record<string, unknown>;

  it('builds one Offer per live plan from the effective price', () => {
    expect(buildPlanOffers(plans)).toEqual([
      {
        '@type': 'Offer', name: 'Starter', price: 899, priceCurrency: 'INR',
        description: '1-month plan', url: `${SITE_URL}/#pricing`,
      },
      {
        '@type': 'Offer', name: 'Growth', price: 0, priceCurrency: 'INR',
        description: '12-month plan', url: `${SITE_URL}/#pricing`,
      },
    ]);
  });

  it('adds the offers to the SoftwareApplication node', () => {
    const node = softwareNode(buildHomeStructuredData(buildPlanOffers(plans)));
    expect(node.offers).toHaveLength(2);
  });

  it('omits offers when no plans load, rather than claiming a price', () => {
    expect(softwareNode(buildHomeStructuredData())).not.toHaveProperty('offers');
    expect(softwareNode(buildHomeStructuredData([]))).not.toHaveProperty('offers');
  });

  it('keeps the no-offers base graph for the other contract tests', () => {
    expect(HOME_STRUCTURED_DATA['@graph'].map((n) => (n as { '@type': string })['@type'])).toEqual([
      'Organization', 'WebSite', 'SoftwareApplication', 'WebPage', 'FAQPage',
    ]);
  });
});
```

Also import `type { PublicPlan } from '@/components/landing/types'`.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts -t "homepage offers"`
Expected: FAIL — `buildPlanOffers` / `buildHomeStructuredData` are not exported.

- [ ] **Step 3: Replace the const with the builder**

In `src/lib/home-structured-data.ts`:

```ts
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
      // Keep the existing WebPage, speakable and FAQPage nodes from this file
      // verbatim, in the same order, after the SoftwareApplication node.
    ],
  };
}

export const HOME_STRUCTURED_DATA = buildHomeStructuredData();
```

Remove `HOME_STRUCTURED_DATA_JSON` and the now-unused `toJsonLd` import from this file. Then update `src/app/(chrome)/page.tsx`:

```tsx
import { buildHomeStructuredData } from '@/lib/home-structured-data';
import { toJsonLd } from '@/lib/schema-org';

const HOME_JSON_LD = toJsonLd(buildHomeStructuredData());
```

and use `HOME_JSON_LD` in the existing script tag.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/home-structured-data.ts src/app/(chrome)/page.tsx src/__tests__/publicRoutes.seo.test.ts
git commit -m "feat(seo): build homepage offers from live plans"
```

---

### Task 5: Server-render public prices and stats

**Files:**
- Create: `src/lib/public-landing.ts`
- Create: `src/__tests__/public-landing.test.ts`
- Create: `src/__tests__/home-page.test.tsx`
- Modify: `src/app/(chrome)/page.tsx`
- Modify: `src/components/StudioHome.tsx:45-45,152-154`
- Modify: `src/components/LandingPage.tsx:37-68`
- Test: `src/__tests__/public-landing.test.ts`, `src/__tests__/home-page.test.tsx`

**Interfaces:**
- Consumes: `PublicPlan`, `PublicStats`.
- Produces:
  - `type PublicLandingData = { plans: PublicPlan[]; founderSlots: number | null; trialDays: number | null; stats: PublicStats | null }`
  - `getPublicLandingData(): Promise<PublicLandingData | null>`
  - `StudioHome({ anonymousHint?: boolean; initialPublicData?: PublicLandingData | null })`
  - `LandingPage({ initialData?: PublicLandingData | null })`

- [ ] **Step 1: Write the failing data tests**

Create `src/__tests__/public-landing.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

const response = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response);

const plansBody = {
  data: {
    plans: [{
      code: 'starter', name: 'Starter', price_inr: 999, effective_price_inr: 899,
      is_launch: false, duration_months: 1, client_limit: 30, best_for: null,
    }],
    founder_slots_remaining: 4,
    trial_days: 7,
  },
};

const statsBody = {
  data: { studios: 120, trainers: 180, active_clients: 2400, sessions_completed: 51000 },
};

describe('getPublicLandingData', () => {
  it('merges both public endpoints', async () => {
    fetchMock
      .mockImplementationOnce(() => response(plansBody))
      .mockImplementationOnce(() => response(statsBody));

    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toEqual({
      plans: plansBody.data.plans,
      founderSlots: 4,
      trialDays: 7,
      stats: statsBody.data,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.example.test/api/public/plans',
      expect.objectContaining({ next: { revalidate: 300 }, signal: expect.any(AbortSignal) }),
    );
  });

  it('keeps the plans when only the stats request fails', async () => {
    fetchMock
      .mockImplementationOnce(() => response(plansBody))
      .mockImplementationOnce(() => Promise.reject(new Error('cold')));

    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toEqual({
      plans: plansBody.data.plans,
      founderSlots: 4,
      trialDays: 7,
      stats: null,
    });
  });

  it('returns null when both endpoints fail', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error('cold')));
    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toBeNull();
  });

  it('does not fetch when the API URL is unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats a malformed plans payload as no plans, not a crash', async () => {
    fetchMock
      .mockImplementationOnce(() => response({ data: { plans: 'nope' } }))
      .mockImplementationOnce(() => response(statsBody));

    const { getPublicLandingData } = await import('@/lib/public-landing');
    await expect(getPublicLandingData()).resolves.toEqual({
      plans: [], founderSlots: null, trialDays: null, stats: statsBody.data,
    });
  });
});
```

Create `src/__tests__/home-page.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isAnonymousRequest: vi.fn(),
  getPublicLandingData: vi.fn(),
}));

vi.mock('@/lib/session-hint', () => ({ isAnonymousRequest: mocks.isAnonymousRequest }));
vi.mock('@/lib/public-landing', () => ({ getPublicLandingData: mocks.getPublicLandingData }));
vi.mock('@/components/StudioHome', () => ({
  default: ({ anonymousHint, initialPublicData }: {
    anonymousHint?: boolean;
    initialPublicData?: unknown;
  }) => (
    <div
      data-testid="studio-home"
      data-anonymous={String(anonymousHint)}
      data-initial={String(Boolean(initialPublicData))}
    />
  ),
}));

import Page from '@/app/(chrome)/page';

const plan = {
  code: 'starter', name: 'Starter', price_inr: 999, effective_price_inr: 899,
  is_launch: false, duration_months: 1, client_limit: 30, best_for: 'Solo trainers',
};
const data = {
  plans: [plan],
  founderSlots: 3,
  trialDays: 7,
  stats: { studios: 1, trainers: 2, active_clients: 3, sessions_completed: 4 },
};
const softwareNode = (container: HTMLElement) => {
  const script = container.querySelector('script[type="application/ld+json"]');
  const json = JSON.parse(script!.innerHTML);
  return json['@graph'].find((n: { '@type': string }) => n['@type'] === 'SoftwareApplication');
};

beforeEach(() => vi.clearAllMocks());

describe('homepage server data', () => {
  it('fetches and renders live offers for an anonymous request', async () => {
    mocks.isAnonymousRequest.mockResolvedValue(true);
    mocks.getPublicLandingData.mockResolvedValue(data);
    const { container } = render(await Page());

    expect(mocks.getPublicLandingData).toHaveBeenCalledOnce();
    expect(screen.getByTestId('studio-home')).toHaveAttribute('data-initial', 'true');
    expect(softwareNode(container).offers).toEqual([{
      '@type': 'Offer', name: 'Starter', price: 899, priceCurrency: 'INR',
      description: '1-month plan', url: 'https://myptstudio.com/#pricing',
    }]);
  });

  it('skips the fetch entirely for a signed-in request', async () => {
    mocks.isAnonymousRequest.mockResolvedValue(false);
    const { container } = render(await Page());

    expect(mocks.getPublicLandingData).not.toHaveBeenCalled();
    expect(screen.getByTestId('studio-home')).toHaveAttribute('data-initial', 'false');
    expect(softwareNode(container)).not.toHaveProperty('offers');
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/__tests__/public-landing.test.ts src/__tests__/home-page.test.tsx`
Expected: FAIL — `@/lib/public-landing` cannot be resolved.

- [ ] **Step 3: Create `src/lib/public-landing.ts`**

```ts
import type { PublicPlan, PublicStats } from '@/components/landing/types';

export type PublicLandingData = {
  plans: PublicPlan[];
  founderSlots: number | null;
  trialDays: number | null;
  stats: PublicStats | null;
};

type PlansPayload = {
  data?: {
    plans?: PublicPlan[];
    founder_slots_remaining?: number | null;
    trial_days?: number | null;
  };
};

type StatsPayload = { data?: PublicStats | null };

/**
 * Live public facts for the landing page, fetched on the server so a crawler
 * that runs no JavaScript still sees prices and stats. Never throws: a missing
 * API URL, a cold backend or a malformed body simply leaves the facts out, and
 * the client fetch fills them in after hydration.
 */
export async function getPublicLandingData(): Promise<PublicLandingData | null> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  if (!base) return null;

  const getJson = async <T,>(path: string): Promise<T | null> => {
    try {
      const res = await fetch(`${base}${path}`, {
        signal: AbortSignal.timeout(2000),
        next: { revalidate: 300 },
      });
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  };

  const [plansPayload, statsPayload] = await Promise.all([
    getJson<PlansPayload>('/api/public/plans'),
    getJson<StatsPayload>('/api/public/stats'),
  ]);

  if (!plansPayload && !statsPayload) return null;

  const plans = plansPayload?.data?.plans;
  return {
    plans: Array.isArray(plans) ? plans : [],
    founderSlots: plansPayload?.data?.founder_slots_remaining ?? null,
    trialDays: plansPayload?.data?.trial_days ?? null,
    stats: statsPayload?.data ?? null,
  };
}
```

- [ ] **Step 4: Wire it through the page and components**

In `src/app/(chrome)/page.tsx`, replace the module-level JSON-LD with a per-request value:

```tsx
const anonymous = await isAnonymousRequest();
const publicData = anonymous ? await getPublicLandingData() : null;
const jsonLd = toJsonLd(
  buildHomeStructuredData(buildPlanOffers(publicData?.plans ?? [])),
);
```

Render the script with `jsonLd` and pass the props:

```tsx
<StudioHome anonymousHint={anonymous} initialPublicData={publicData} />
```

In `src/components/StudioHome.tsx`, accept and forward the prop (type-only import):

```tsx
import type { PublicLandingData } from '@/lib/public-landing';

export default function StudioHome({
  anonymousHint = false,
  initialPublicData = null,
}: {
  anonymousHint?: boolean;
  initialPublicData?: PublicLandingData | null;
}) {
```

Change the landing render to `<LandingPage initialData={initialPublicData} />`.

In `src/components/LandingPage.tsx`, seed each existing state value and keep the effect as the refresh:

```tsx
export default function LandingPage({
  initialData = null,
}: { initialData?: PublicLandingData | null }) {
  const [plans, setPlans] = useState<PublicPlan[]>(initialData?.plans ?? []);
  const [founderSlots, setFounderSlots] = useState<number | null>(initialData?.founderSlots ?? null);
  const [trialDays, setTrialDays] = useState(initialData?.trialDays ?? 7);
  const [trialLoaded, setTrialLoaded] = useState(initialData?.trialDays != null);
  const [stats, setStats] = useState<PublicStats | null>(initialData?.stats ?? null);
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run src/__tests__/public-landing.test.ts src/__tests__/home-page.test.tsx src/__tests__/publicRoutes.seo.test.ts`
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/public-landing.ts src/__tests__/public-landing.test.ts src/__tests__/home-page.test.tsx \
  src/app/\(chrome\)/page.tsx src/components/StudioHome.tsx src/components/LandingPage.tsx
git commit -m "feat(seo): server-render public prices and stats"
```

---

### Task 6: Every FAQ answer in the HTML

**Files:**
- Modify: `src/components/landing/FaqSection.tsx:5,68-83`
- Create: `src/__tests__/faq-section.test.tsx`

**Interfaces:**
- Consumes: `FaqSection` props unchanged.
- Produces: every answer remains mounted; closed panels are `aria-hidden="true"`.

- [ ] **Step 1: Write the failing component test**

Create `src/__tests__/faq-section.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  useReducedMotion: () => true,
  m: new Proxy({}, {
    get: (_target, tag: string) =>
      ({ children, initial, animate, transition, whileInView, viewport, ...rest }: Record<string, unknown>) => {
        void initial; void animate; void transition; void whileInView; void viewport;
        return React.createElement(tag, rest, children as React.ReactNode);
      },
  }),
}));

import FaqSection from '@/components/landing/FaqSection';
import { HOME_FAQ } from '@/components/landing/faq-content';

describe('FaqSection', () => {
  it('renders every answer into the DOM, not just the open one', () => {
    render(<FaqSection />);
    for (const item of HOME_FAQ) expect(screen.getByText(item.a)).toBeInTheDocument();
  });

  it('marks only the open answer as visible to assistive technology', () => {
    render(<FaqSection />);
    const panels = HOME_FAQ.map((item) => screen.getByText(item.a).closest('[role="region"]'));
    expect(panels[0]).toHaveAttribute('aria-hidden', 'false');
    for (const panel of panels.slice(1)) expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('still opens a closed answer on click', () => {
    render(<FaqSection />);
    const second = document.getElementById('faq-button-1')!;
    fireEvent.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    const panel = screen.getByText(HOME_FAQ[1].a).closest('[role="region"]');
    expect(panel).toHaveAttribute('aria-hidden', 'false');
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npx vitest run src/__tests__/faq-section.test.tsx`
Expected: FAIL — `Unable to find an element with the text` for the second answer.

- [ ] **Step 3: Keep the panel mounted**

In `src/components/landing/FaqSection.tsx`, remove the `AnimatePresence` import and replace the conditional block with one always-rendered panel:

```tsx
<m.div
  id={`faq-panel-${i}`}
  role="region"
  aria-labelledby={`faq-button-${i}`}
  aria-hidden={!isOpen}
  initial={false}
  animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
  transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
  className="overflow-hidden"
>
  <p className="px-5 pb-5 text-[14px] leading-[1.6]" style={{ color: C.muted }}>{f.a}</p>
</m.div>
```

Update the file's comment to say every answer stays in the HTML for crawlers, with closed panels `aria-hidden` and collapsed.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/__tests__/faq-section.test.tsx`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/FaqSection.tsx src/__tests__/faq-section.test.tsx
git commit -m "feat(seo): keep every FAQ answer in the HTML"
```

---

### Task 7: `/start-free` structured data

**Files:**
- Create: `src/lib/start-free-structured-data.ts`
- Modify: `src/app/(bare)/start-free/layout.tsx:13-33`
- Test: `src/__tests__/publicRoutes.seo.test.ts`

**Interfaces:**
- Consumes: `ORGANIZATION_NODE`, `WEBSITE_NODE`, `WEBSITE_ID`, `SITE_URL`, `canonicalUrl`, `toJsonLd`.
- Produces: `START_FREE_STRUCTURED_DATA` and `START_FREE_STRUCTURED_DATA_JSON`.

- [ ] **Step 1: Add the failing tests**

```ts
describe('/start-free structured data', () => {
  type SchemaNode = Record<string, unknown> & { '@type': string };
  const graph = START_FREE_STRUCTURED_DATA['@graph'] as readonly SchemaNode[];
  const node = (type: string) => graph.find((n) => n['@type'] === type);

  it('describes the organization, site, page and breadcrumb', () => {
    expect(graph.map((n) => n['@type'])).toEqual([
      'Organization', 'WebSite', 'WebPage', 'BreadcrumbList',
    ]);
  });

  it('crumbs home to /start-free in one step', () => {
    const crumbs = (node('BreadcrumbList') as { itemListElement: { item: string }[] }).itemListElement;
    expect(crumbs.map((c) => c.item)).toEqual([SITE_URL, canonicalUrl('/start-free')]);
  });

  it('shares the homepage entity ids', () => {
    const home = HOME_STRUCTURED_DATA['@graph'] as readonly SchemaNode[];
    for (const type of ['Organization', 'WebSite']) {
      const own = node(type) as Record<string, unknown>;
      const shared = home.find((n) => n['@type'] === type) as Record<string, unknown>;
      expect(own['@id']).toBe(shared['@id']);
    }
  });

  it('ships the JSON-LD in the layout a crawler receives', () => {
    expect(read('(bare)/start-free/layout.tsx')).toMatch(/START_FREE_STRUCTURED_DATA_JSON/);
    expect(read('(bare)/start-free/layout.tsx')).toMatch(/application\/ld\+json/);
  });
});
```

Import `START_FREE_STRUCTURED_DATA` from `@/lib/start-free-structured-data`.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts -t "/start-free structured data"`
Expected: FAIL — module cannot be resolved.

- [ ] **Step 3: Create the schema module**

`src/lib/start-free-structured-data.ts`:

```ts
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
```

- [ ] **Step 4: Render it from the layout**

In `src/app/(bare)/start-free/layout.tsx`:

```tsx
import { START_FREE_STRUCTURED_DATA_JSON } from '@/lib/start-free-structured-data';

export default function StartFreeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* In the layout, not a component: it must be in the HTML a crawler gets. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: START_FREE_STRUCTURED_DATA_JSON }}
      />
      {children}
    </>
  );
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts`
Expected: all passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/start-free-structured-data.ts src/app/\(bare\)/start-free/layout.tsx src/__tests__/publicRoutes.seo.test.ts
git commit -m "feat(seo): add /start-free structured data"
```

---

### Task 8: Snippet and large-image controls

**Files:**
- Modify: `src/app/(chrome)/page.tsx:43`
- Modify: `src/app/(bare)/pt-os/page.tsx:9`
- Modify: `src/app/(bare)/start-free/layout.tsx:20`
- Modify: `src/lib/seo-routes.ts:5-7` (comment only)
- Test: `src/__tests__/publicRoutes.seo.test.ts:62,182-188`

**Interfaces:**
- Consumes: nothing new.
- Produces: the three public metadata exports use the richer `robots` object.

- [ ] **Step 1: Update the tests first**

In `every public route exports metadata that opts in to indexing`, loosen the source regex so extra keys are allowed:

```ts
expect(src).toMatch(/robots:\s*\{\s*index:\s*true,\s*follow:\s*true\b/);
```

In the `it.each` contract test, replace the equality with:

```ts
expect(m.robots).toEqual({
  index: true,
  follow: true,
  'max-snippet': -1,
  'max-image-preview': 'large',
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts -t "is indexable, followable"`
Expected: FAIL — actual object is missing `max-snippet` and `max-image-preview`.

- [ ] **Step 3: Update all three metadata exports**

In each of `src/app/(chrome)/page.tsx`, `src/app/(bare)/pt-os/page.tsx`, and `src/app/(bare)/start-free/layout.tsx`:

```ts
robots: {
  index: true,
  follow: true,
  'max-snippet': -1,
  'max-image-preview': 'large',
},
```

Do not touch the root layout's `{ index: false, follow: false }`.

Update the `seo-routes.ts` header comment from `robots: { index: true, follow: true }` to the full object so the contract text matches the code.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/__tests__/publicRoutes.seo.test.ts`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(chrome\)/page.tsx src/app/\(bare\)/pt-os/page.tsx \
  src/app/\(bare\)/start-free/layout.tsx src/lib/seo-routes.ts src/__tests__/publicRoutes.seo.test.ts
git commit -m "feat(seo): let crawlers use full snippets and large images"
```

---

## Full verification

After Task 8:

```bash
npx vitest run \
  src/__tests__/publicRoutes.seo.test.ts \
  src/__tests__/public-landing.test.ts \
  src/__tests__/faq-section.test.tsx \
  src/__tests__/home-page.test.tsx
npm run typecheck
npm run lint
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run build
```

Expected: every test passes; typecheck and lint are clean; the build completes. The dummy API URL only satisfies `next.config.js`'s production rewrite check — the server fetch does not run during the build.

Manual check with the app running:

```bash
curl -s http://localhost:3000/llms.txt | head
curl -s http://localhost:3000/robots.txt
curl -s http://localhost:3000/ | grep -o '"@type":"Offer"' | head
curl -s http://localhost:3000/ | grep -o 'Questions, answered' | head -1
```

The homepage HTML must contain the FAQ answers, and `Offer` nodes only when the dev backend returned plans.

---

## Post-deploy evidence

These three reports are **dated evidence after release**, not build tasks. They add no commits and do not block Task 1–8. Run them once the new build is live, then keep the filled-in results in the release notes or a dated file under `docs/superpowers/reports/`.

### 1. GEO Security Audit Report

Prove the crawler-visible surface contains only public facts and every authenticated path still refuses anonymous requests.

**Commands:**

```bash
# Follow redirects: every private page must land on a sign-in page, never on app HTML.
for p in /pt-os/clients /client /trainer /attendance /finance /settings; do
  printf '%s -> ' "$p"
  curl -sL -o /dev/null -w '%{http_code} %{url_effective}\n' "https://myptstudio.com$p"
done

# Private API must be 401; the public plans endpoint must stay 200.
curl -s -o /dev/null -w 'auth/me %{http_code}\n' https://myptstudio.com/api/auth/me
curl -s -o /dev/null -w 'public/plans %{http_code}\n' https://myptstudio.com/api/public/plans

# Crawler aids are reachable.
curl -s -o /dev/null -w 'llms.txt %{http_code}\n' https://myptstudio.com/llms.txt
curl -s https://myptstudio.com/robots.txt

# Public JSON-LD contains only the expected node types.
curl -s https://myptstudio.com/ | grep -o '"@type":"[^"]*"' | sort -u
```

**Expected:** every private page's final URL contains `login`; `/api/auth/me` is 401 and `/api/public/plans` is 200; `llms.txt` is 200; `robots.txt` has the `*` rule first and the AI-crawler rule second; the homepage JSON-LD lists only `Organization`, `WebSite`, `SoftwareApplication`, `WebPage`, `FAQPage`, plus `Offer` inside `SoftwareApplication` when plans are live. No client names, client emails, phone numbers, payments or health data in any public response. The support email in `Organization` is intentionally public.

Record:

| Check | Expected | Actual | Pass |
|---|---|---|---|
| Private page anon request | final URL is a sign-in page | | |
| `/api/auth/me` anon | 401 | | |
| `/api/public/plans` | 200 | | |
| `llms.txt` | 200 | | |
| AI crawler rule | present, private blocks | | |
| Public JSON-LD node types | expected set | | |
| Public HTML private data | none | | |

### 2. Structured Data Validation Report

Validate the deployed URLs, not the local source:

- Schema Markup Validator: `https://validator.schema.org/#url=https%3A%2F%2Fmyptstudio.com%2F`
- Google Rich Results Test: `https://search.google.com/test/rich-results?url=https%3A%2F%2Fmyptstudio.com%2F`

Run both for `/`, `/pt-os` and `/start-free`. Run `/` again while the backend is returning live plans so the per-plan `Offer` nodes are present.

**Expected:** no schema.org errors on any page. Warnings are acceptable when explained. Note two known limits:

- Google restricts FAQ rich results to authoritative government and health sites, so a FAQPage eligibility warning is expected; the markup is still valid and useful to AI engines.
- `llms.txt` is a proposed convention, not a standards-track file; validators will ignore it.

If the validator reports a real error, fix it in the owning task, rerun that task's tests, and repeat this report.

Record:

| URL | Node types | Errors | Warnings | Offers present | Date |
|---|---|---|---|---|---|
| `/` | | | | | |
| `/pt-os` | | | | n/a | |
| `/start-free` | | | | n/a | |

### 3. AI Search Discoverability Baseline Report

This is observational, not a pass/fail gate. AI answers are non-deterministic, so record what was asked and what came back rather than claiming a ranking.

Capture on deploy day:

- `llms.txt` returns 200 and names `/`, `/pt-os`, `/start-free`.
- `robots.txt` allows the eleven AI crawlers on the public routes.
- `sitemap.xml` lists exactly the three canonical URLs.
- The raw homepage HTML (no JavaScript) contains the live prices and every FAQ answer.

Use this fixed query set, unchanged between checks:

1. `best personal trainer software India`
2. `PT OS personal trainer software`
3. `MY PT STUDIO pricing`
4. `fitness studio management software India`

At deploy, 2 weeks and 6 weeks, record for each engine (ChatGPT, Perplexity, Claude, Gemini):

| Date | Engine | Query | Brand mentioned | URL cited | Price/trial accurate |
|---|---|---|---|---|---|
| | | | | | |

Do not change the query set between checks, or the baseline stops being comparable.

### When to stop

The build is complete when Tasks 1–8 pass their tests, typecheck, lint and build. The three reports above are post-release evidence; a report failure opens a fix task, it does not reopen the whole plan.

