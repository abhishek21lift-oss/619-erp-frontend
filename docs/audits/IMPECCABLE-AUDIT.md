# Impeccable UI Audit — 619-erp-frontend

**Date:** 2026-10-18
**Scope:** Whole `src/` (590 TSX files). Detector run over `src/` only (excludes `design-prototypes/`, `public/`).
**Command:** `/impeccable audit src`

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3/4 | Good ARIA/alt coverage; a few clickable divs without roles; reduced-motion handled (24 sites) |
| 2 | Performance | 2/4 | Only 8 `next/image`, 3 `loading="lazy"` across 590 files; many plain `<img>` |
| 3 | Theming | 3/4 | Strong token system in globals.css + tailwind; ~116 unique hex; dark mode present |
| 4 | Responsive Design | 3/4 | Tailwind breakpoints used; some sub-44px touch targets (h-38/40, w-38) |
| 5 | Implementation Integrity | 2/4 | 30 detector findings in src (side-tab 12, gradient-text 6, ai-color-palette 6, bounce-easing 5 advisory, broken-image 1) |
| **Total** | | **13/20** | **Acceptable — significant work needed on perf + integrity** |

Rating band: 10-13 Acceptable.

## Implementation Integrity Verdict

**Pass with caveats.** The app has a coherent, product-specific design system (globals.css tokens, palette.ts parity, bottom-nav token). However, detector flags recurring shortcuts: side-tab accent borders on 12 surfaces, gradient-text on 6 (mostly finance/record-payment), AI-color-palette gradients on 6 (indigo/violet), and advisory bounce easing on 5. These are concentrated in a handful of files, not systemic across all 590.

## Executive Summary

- Audit Health Score: **13/20** (Acceptable)
- Total issues: P0 0, P1 9, P2 14, P3 7 (detector + manual)
- Top critical issues:
  1. Performance: near-total absence of `next/image` and lazy loading — large bundle/image cost.
  2. Integrity: gradient-text + AI color palette concentrated in `finance/record-payment/page.tsx`.
  3. Integrity: side-tab accent borders across 6+ pages + globals.css utilities.
  4. Accessibility: clickable `<div>`/`<span>` without role/tabIndex in a few spots.
  5. Responsive: sub-44px touch targets in several components.
- Recommended next steps: run `/impeccable optimize` (images), `/impeccable layout` (side-tabs/gradients), `/impeccable harden` (a11y divs), then `/impeccable polish`.

## Detailed Findings by Severity

### P1 — Major

**[P1] Plain `<img>` instead of `next/image` (no optimization)**
- Location: src/components/* (UserPhoto, ExerciseCard, ClientAvatar, StudioMark, ProfileHero, PortfolioSection, GlobalSearch, UpiPayScreen)
- Category: Performance
- Impact: No automatic sizing, lazy loading, or format optimization; hurts CWV/LCP.
- WCAG/Standard: Core Web Vitals
- Recommendation: Migrate above-the-fold images to `next/image`; keep plain `<img>` only for proxied `/uploads/*` where justified, with `loading="lazy"` + explicit dimensions.
- Suggested command: `/impeccable optimize`

**[P1] Gradient text (bg-clip-text)**
- Location: src/app/(chrome)/finance/record-payment/page.tsx:169, 209; src/app/globals.css:1901,1908,1924,1930
- Category: Implementation Integrity
- Impact: Decorative gradient text reduces readability and signals AI-generated styling.
- Recommendation: Replace with solid token color (e.g. `--brand` / `--gray-900`).
- Suggested command: `/impeccable layout`

**[P1] AI color palette (indigo/violet gradients)**
- Location: src/app/(chrome)/finance/record-payment/page.tsx:28,179,209,344; src/components/modules/ModuleWorkspace.tsx:59; src/__tests__/page-shell.test.ts:269
- Category: Implementation Integrity
- Impact: Off-palette indigo/violet gradients break the "one restrained palette" (blue/emerald/amber/red/slate) design system.
- Recommendation: Remap to brand tokens; remove violet/indigo gradients.
- Suggested command: `/impeccable colorize`

**[P1] Side-tab accent borders**
- Location: src/app/(chrome)/checkin/dashboard/page.tsx:41; help/page.tsx:67; settings/integrations/page.tsx:127,276,388; subscription/packages/page.tsx:172; components/modules/WhatsAppCard.tsx:241; src/app/globals.css:1823-1827
- Category: Implementation Integrity
- Impact: Left-border accent cards are a common AI-slop pattern; flattens hierarchy.
- Recommendation: Replace with spacing/typography/dividers per design system.
- Suggested command: `/impeccable layout`

**[P1] Clickable `<div>`/`<span>` without role/tabIndex**
- Location: src/app/(chrome)/engagement/whatsapp/page.tsx:139; src/app/(chrome)/ai-coach/page.tsx:859; src/app/(bare)/member/goals/page.tsx:308,380; src/app/(chrome)/pt-os/clients/[id]/workout-log/[sessionId]/page.tsx:723; progress-photos/page.tsx:262
- Category: Accessibility
- Impact: Keyboard users can't activate; screen readers miss semantics.
- WCAG: 4.1.2 Name, Role, Value
- Recommendation: Convert to `<button>` or add `role="button"`, `tabIndex={0}`, key handlers.
- Suggested command: `/impeccable harden`

**[P1] Touch targets below 44px**
- Location: multiple (h-[38px], h-[40px], h-[32px], w-[38px] usages)
- Category: Responsive Design
- Impact: Hard to tap on mobile; WCAG 2.5.5.
- Recommendation: Enforce min 44x44px for interactive elements.
- Suggested command: `/impeccable adapt`

**[P1] Bounce easing (advisory)**
- Location: src/app/globals.css:256,1109,1151,1475; src/components/common/PullToRefresh/animations.ts:16
- Category: Implementation Integrity
- Impact: Bouncy motion feels unprofessional; may violate reduced-motion expectations.
- Recommendation: Replace with standard ease-out; keep bounce only where playful intent is documented.
- Suggested command: `/impeccable animate`

### P2 — Minor

**[P2] Only 3 `loading="lazy"` across app**
- Location: src-wide
- Category: Performance
- Impact: Off-screen images load eagerly.
- Recommendation: Add `loading="lazy"` to below-fold `<img>`.
- Suggested command: `/impeccable optimize`

**[P2] Reduced-motion: global 0.01ms kill risk**
- Location: src (24 sites)
- Category: Accessibility
- Impact: Verify no global `* { animation-duration: 0.01ms }` that destroys feedback; ensure intentional alternative.
- Recommendation: Audit reduced-motion blocks for state-preserving alternatives.
- Suggested command: `/impeccable audit`

**[P2] Hard-coded hex colors (~116 unique)**
- Location: src-wide
- Category: Theming
- Impact: Some values bypass tokens; theme switching gaps.
- Recommendation: Replace with CSS variables / tailwind tokens.
- Suggested command: `/impeccable extract`

**[P2] Dark mode coverage sparse (195 `dark:` across 590 files)**
- Location: src-wide
- Category: Theming
- Impact: Some surfaces may not adapt to dark theme.
- Recommendation: Verify each page in dark mode; add missing variants.
- Suggested command: `/impeccable audit`

**[P2] Form inputs missing labels (manual spot-check)**
- Location: various forms
- Category: Accessibility
- Impact: Screen reader users can't identify fields.
- Recommendation: Associate `<label htmlFor>` / `aria-label` for every input.
- Suggested command: `/impeccable harden`

### P3 — Polish

**[P3] Overused font (Inter)**
- Location: tailwind.config.ts; globals.css
- Category: Implementation Integrity
- Impact: Generic; consider a distinctive face per design brief.
- Recommendation: Only if redesigning identity; otherwise acceptable.

**[P3] Pulsing status dots (if any in app src)**
- Location: none detected in src (only prototypes)
- Category: Implementation Integrity
- Impact: N/A for app; prototypes only.

**[P3] Decorative blobs / glassmorphism utilities**
- Location: tailwind safelist (globals + components)
- Category: Implementation Integrity
- Impact: Visual noise; keep if intentional brand.

**[P3] Nested cards**
- Location: not flagged by detector in src
- Category: Implementation Integrity
- Impact: N/A.

**[P3] Console/noise: design-prototypes + public wireframes not production**
- Location: design-prototypes/, public/wireframes.html
- Category: Implementation Integrity
- Impact: Detector noise from non-shipping files; exclude from CI.
- Recommendation: Add to detector ignore list.

## Patterns & Systemic Issues

1. **Image optimization gap**: `next/image` used only 8 times across 590 files; plain `<img>` dominates. Systemic performance risk.
2. **Concentrated slop in finance/record-payment**: gradient-text + AI palette + side-tab all cluster in one file — likely copy-paste from a prototype.
3. **Side-tab accent pattern**: repeated across 6+ pages + globals utilities; suggests a shared component should be refactored.
4. **Touch targets**: several h-32/38/40 buttons below 44px; inconsistent with bottom-nav's 44px standard.

## Positive Findings

- Excellent design token system in `globals.css` (palette → semantic aliases; `--bottom-nav-h` derived token).
- `src/lib/palette.ts` parity with CSS (documented).
- Dark mode tokens exist (`[data-theme="dark"], .dark`).
- `prefers-reduced-motion` handled in 24 places.
- Strong ARIA coverage (528 `aria-label` usages) and alt text on `<img>`.
- Touch-target convention 44px used widely (`h-[44px]` 165 times).
- Bottom-nav height token prevents overlap (BOTTOM-NAV.md).

## Recommended Actions

1. **[P1] `/impeccable optimize`**: Migrate images to `next/image`, add lazy loading, explicit dimensions.
2. **[P1] `/impeccable layout`**: Remove side-tab borders + gradient text in finance/record-payment and globals.
3. **[P1] `/impeccable colorize`**: Remap indigo/violet gradients to brand tokens.
4. **[P1] `/impeccable harden`**: Fix clickable divs, form labels, keyboard handlers.
5. **[P1] `/impeccable adapt`**: Enforce 44px touch targets.
6. **[P2] `/impeccable extract`**: Tokenize remaining hard-coded hex.
7. **[P2] `/impeccable audit`**: Re-run after fixes; verify dark mode + reduced-motion.
8. **[P3] `/impeccable polish`**: Final pass.

> Re-run `/impeccable audit` after fixes to see your score improve.

## Notes

- Detector findings include `src/__tests__/page-shell.test.ts` and `src/__tests__/print-popup-xss.test.ts` (test files) — verify before treating as app issues.
- `design-prototypes/` and `public/wireframes.html` excluded from scoring; they are non-shipping.
- No PRODUCT.md/DESIGN.md present; consider `/impeccable init` + `/impeccable document` to capture durable context.