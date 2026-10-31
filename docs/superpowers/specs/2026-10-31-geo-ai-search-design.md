# GEO for AI answer engines — design

**Date:** 2026-10-31
**Status:** Proposed
**Scope:** `619-erp-frontend` public marketing surface only.

## Intent

Make `myptstudio.com` legible and citable to AI answer engines — ChatGPT Search,
Perplexity, Claude, Gemini and Google AI Overviews — without exposing any
authenticated app data.

## What success looks like

- A crawler that fetches HTML only (no JavaScript) can read what MY PT STUDIO
  is, who it is for, what it does, the 7-day trial, live plan prices and live
  platform stats when those are available.
- Every public page describes the same organization and product entity.
- The three public routes stay indexable; every authenticated route stays
  `noindex` and robots-disallowed.
- Answers in the FAQ are present in the HTML, not only after a click.

## Current state (verified)

- Three public routes: `/`, `/pt-os`, `/start-free` (`src/lib/seo-routes.ts`).
- `robots.ts` has one `*` rule allowing those three and blocking private
  segments; no explicit AI-crawler rules.
- `sitemap.ts` lists exactly the three canonical URLs.
- `/` and `/pt-os` carry Organization, WebSite, SoftwareApplication, WebPage
  and FAQPage JSON-LD. `/start-free` has none.
- `LandingPage.tsx` fetches `/api/public/plans` and `/api/public/stats` from the
  browser only, so the initial HTML has a loading state, not prices or stats.
- `FaqSection.tsx` unmounts closed answers (`AnimatePresence`), so only the
  first answer is in the initial HTML while the FAQPage schema claims all of
  them.
- `/llms.txt` does not exist and is not in the proxy's public asset list, so an
  anonymous request would be redirected to `/login`.

## Goals

- Server-render the public facts AI crawlers need.
- One consistent entity graph across the three public pages.
- Explicit, private-safe AI crawler policy.
- A static `llms.txt` that summarizes the public product accurately.

## Non-goals

- New marketing pages or a content campaign.
- Off-site entity work (G2/Capterra/LinkedIn, reviews, backlinks).
- Changing the noindex default for the authenticated routes.
- Adding invented addresses, ratings, customer counts or social profiles.

## Anti-goals

- Publishing client health, payment, revenue or staff data.
- Hardcoding stale prices.
- Schema that describes content not on the page.

## Approaches considered

- **A — machine-readable only:** `llms.txt`, AI crawler rules, richer schema,
  `/start-free` JSON-LD, snippet meta. Low risk; pricing and stats stay
  invisible to non-JS crawlers.
- **B — A + server-rendered live facts (chosen):** fetch public plans/stats on
  the server for anonymous requests, pass them into the landing page, add real
  offers, and put every FAQ answer in the HTML.
- **C — B + new comparison/guide pages:** the real long-term content play, but
  it adds public routes and needs a content owner. Deferred.

## Design (B)

### 1. `llms.txt`

Add `public/llms.txt`, a static Markdown summary:

- one-paragraph description of MY PT STUDIO;
- who it is for;
- the five product areas and their real features;
- 7-day free trial, no card, INR pricing, live prices at `/#pricing`;
- links to `/`, `/pt-os`, `/start-free`;
- contact `support@myptstudio.com`;
- a note that the authenticated app is private and not for indexing.

Add `/llms.txt` to `PUBLIC_ASSET_PREFIXES` in `src/proxy.ts` so it is served
without a session. Do not add `/llms.txt` to `PUBLIC_SEO_ROUTES`: it is a
crawler aid, not a page.

### 2. AI crawler policy

In `src/app/robots.ts`, keep the existing `*` rule first and add one rule with
the same `allow`/`disallow` lists for:

`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`,
`ClaudeBot`, `Claude-SearchBot`, `Claude-User`, `Google-Extended`,
`Applebot-Extended`, `CCBot`.

The private segments and `/pt-os/` prefix stay blocked for all of them.

### 3. Entity and product schema

- `src/lib/schema-org.ts`: add `email: 'support@myptstudio.com'` and a
  `contactPoint` for customer support to `ORGANIZATION_NODE`. No address or
  `sameAs` until real values exist.
- Export `SOFTWARE_FEATURES` from the same file, derived from the feature grid
  copy: dashboard, attendance/check-in, billing/collections, client lifecycle,
  programmes/templates, exercise library, progress tracking, AI Coach, AI
  insights, knowledge base, WhatsApp outreach, campaigns/offers, finance and
  forecast, multi-branch.
- Add `featureList: SOFTWARE_FEATURES` to both `SoftwareApplication` nodes.
- `src/lib/home-structured-data.ts`: replace the exported const with
  `buildHomeStructuredData(offers?)`; keep `HOME_STRUCTURED_DATA` as the
  no-offers base for tests.
- When live plans exist, add an `offers` array of per-plan `Offer` nodes:
  `name`, `price` (`effective_price_inr`), `priceCurrency: 'INR'`,
  `description` (duration), `url: `${SITE_URL}/#pricing``. Omit `offers` when
  no plans load; never invent a price.

### 4. Server-rendered live facts

New `src/lib/public-landing.ts`:

- `getPublicLandingData()` fetches `${NEXT_PUBLIC_API_URL}/api/public/plans` and
  `/api/public/stats` in parallel.
- 2-second `AbortSignal.timeout`, `next: { revalidate: 300 }`.
- Returns `{ plans, founderSlots, trialDays, stats }` or `null`; partial data is
  allowed. Never throws.

`src/app/(chrome)/page.tsx`:

- Only fetch when `isAnonymousRequest()` is true.
- Pass `initialPublicData` to `StudioHome`.

`src/components/StudioHome.tsx` and `LandingPage.tsx`:

- Accept the initial data and seed the existing state with it.
- Keep the client fetch as a refresh; failures still leave the page usable.

`PricingSection` and `TrustBar` already render from props, so they need no
changes.

### 5. FAQ answers in the HTML

In `src/components/landing/FaqSection.tsx`, keep every panel mounted and animate
height/opacity instead of mounting only the open one. Closed panels stay
`aria-hidden` and visually collapsed, so the full answers are in the HTML for
crawlers and the accordion behaviour is unchanged for users.

### 6. `/start-free` schema

New `src/lib/start-free-structured-data.ts` with Organization, WebSite, WebPage
and BreadcrumbList. Render it from `src/app/(bare)/start-free/layout.tsx`, which
is already a server component.

### 7. Snippet controls

Add `'max-snippet': -1` and `max-image-preview: 'large'` to the `robots` object
of the three public metadata exports. The root layout keeps
`{ index: false, follow: false }`.

### 8. Tests

Extend `src/__tests__/publicRoutes.seo.test.ts`:

- public route robots objects match `{ index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' }`;
- the AI-crawler rule allows only the three public routes and blocks private
  segments;
- `llms.txt` exists, names the three public URLs, and `isPublicProxyPath`
  returns true for it;
- `/start-free` structured data has WebPage + BreadcrumbList and shares the
  Organization/WebSite ids;
- `buildHomeStructuredData(offers)` includes the offers and omits them when
  absent.

Add a component test that `FaqSection` renders every answer in the DOM.

## Decisions made by the builder

- `llms.txt` is static, not a route handler: no live data, no runtime cost.
- Offers are per-plan `Offer` nodes, not one `AggregateOffer`: mixing monthly
  and yearly prices in a low/high range would be misleading.
- The server fetch is anonymous-only and revalidates every 5 minutes; signed-in
  requests skip it entirely.
- If the backend is cold or unreachable, the page renders without prices; the
  client fetch still fills them in after hydration.
- The noindex default and the three-route contract stay untouched.

## Risks

- Server fetch adds TTFB. Mitigated by the timeout, 5-minute revalidate and
  client fallback.
- `llms.txt` is a proposed convention, not an official standard. It is cheap
  and harmless, not a guaranteed ranking factor.
- Hidden accordion content is still hidden content; Google may discount it.
  The JSON-LD remains the stronger signal, and the answers are now at least
  present in the HTML.

## Verification

- `npm test -- publicRoutes.seo` and the new FAQ component test.
- `npm run typecheck`.
- `npm run lint`.
- `npm run build` if time allows.
- Manual: `curl -s https://myptstudio.com/llms.txt`, `/robots.txt`, `/`, and
  grep the HTML for prices, FAQ answers and JSON-LD.
