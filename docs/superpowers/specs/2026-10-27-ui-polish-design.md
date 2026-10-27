# UI Polish — Design

**Date:** 2026-10-27
**Status:** Draft for approval
**Scope:** `619-erp-frontend` — all 136 routes, 320 components
**Chosen approach:** Rules-first, then sweep (A)

---

## 1. Intent

The product has **one design system and three visual languages**. `globals.css` v6.0 defines a coherent, restrained identity (royal blue for action, emerald success, amber warning, red error, slate neutral), and `src/lib/palette.ts` mirrors it with a documented parity invariant. That system is good. The problem is that a large share of the app does not use it.

The goal is **convergence, not redesign**: every screen should read as one product, in the identity that already exists. The user has explicitly ruled out a new visual direction.

**Why now:** intake/assessment remediation is complete and merged. UI inconsistency is now the dominant quality signal in the product, and it is the thing that makes a feature-complete app feel unfinished.

---

## 2. What "polished" means — definition of done

This initiative is only finishable if "polished" is mechanical. Done means all of the following.

**Machine-enforced** — a test fails if these regress:

1. **No literal colour in components.** No hex, `rgb()` or `rgba()` in `src/**/*.{ts,tsx}` outside the sanctioned token layer: `src/lib/palette.ts`, `src/lib/brand.ts`, `src/app/globals.css`, and the ten decorative theme files that `palette.test.ts` already confines. The existing test answers *which* colours are legal; this rule answers *how they are referenced*.
2. **No sanctioned slop patterns**: no gradient text, no left-accent-stripe cards, no spring/bounce easing.
3. **One brand blue.** Tailwind's `brand` scale and `--rgb-brand` resolve to the same values as `--brand` and `palette.blue`.
4. **A guardrail ratchets the literal count downward.** The count can only fall.

**Verified by checklist** — no reliable static test exists:

5. **Touch targets**: every interactive element is at least 44×44px, or carries a documented exception. Inventoried by grep, verified by hand on touched routes.
6. **Images**: every content image uses `next/image`, or plain `<img>` with `loading="lazy"` and explicit dimensions. Classified per source in Phase 5.
7. **One visual language on the landing surfaces.** The trainer home contains no obsidian/gold gradient hero and no second theme.

---

## 3. Goals

- Remove the root causes of drift, not just the symptoms.
- Make regression impossible without a failing test.
- Reach the definition of done in reviewable batches, each of which lowers a checked-in baseline.
- Leave behind a written rule set (`DESIGN.md`) so the next feature inherits the standard.

## 4. Non-goals

- New brand identity, new typeface, new layout system, new component library.
- Redesigning flows, IA, or navigation structure.
- Completing dark mode across all 136 routes. Touched surfaces must not regress; a full dark-mode pass is a separate initiative.
- Rewriting inline styles that compute values (chart geometry, transforms, measured widths).
- Fixing broken dashboard **data** — see §9. That is a separate track and a prerequisite for the landing-surface phase.

## 5. Anti-goals

- A "polish" that only changes the home page.
- A guardrail so strict it forces churn on legitimate dynamic styles.
- A big-bang PR across 237 files that no one can review.
- Inventing a second token system alongside v6.0.

---

## 6. Evidence: what is actually wrong

Measured over `src/app` and `src/components` (excluding tests and `design-prototypes/`).

### 6.1 Root causes in configuration

| Finding | Detail |
|---|---|
| **Tailwind's `brand` is a different blue** | `tailwind.config.ts` sets `brand.500 = #3B82F6` (generic Tailwind blue). The design system's `--brand` is `#0067E0` (sampled from the logo). Both are called "brand". |
| **`--rgb-brand` is also the wrong blue** | `globals.css:82` sets `--rgb-brand: 59 130 246` = `#3B82F6`. Any `rgb(var(--rgb-brand))` renders the wrong blue. |
| **`globals.css` ships the slop** | `.card.accent-brand/gold/success/danger` are 3px left stripes (`1834–1838`); `.page-title` is gradient text (`1901–1908`); `.metric-value.gold/.brand` are gradient text (`1924–1930`); `--ease-spring` is a bounce curve (`256`) used in four places (`1034`, `1120`, `1162`, `1486`) with no documented exception. |
| **The safelist sanctions off-palette colour** | `tailwind.config.ts` safelists violet/cyan/orange decorative blobs and a violet glow shadow (`rgba(139,92,246,…)`). |
| **A colour guardrail already exists** | `src/__tests__/palette.test.ts` already bans off-palette hex across all of `src/` and confines ten decorative theme files (`landing`, `visualizations`, `memberTheme`, `libraryTheme`, `todayTheme`, `profileTheme`, `attendanceTheme`, `ccTheme`, `fitnessTheme`, `founderGold`). It does **not** ban palette hexes spelled literally, which is the drift this initiative targets. Any new guardrail must extend it, not duplicate it. |

### 6.2 Drift in source

| Metric | Count |
|---|---|
| Files containing a raw hex colour | 237 |
| Distinct hex values in `.tsx` | 69 |
| Raw hex occurrences | ~2,700 |
| `rgba()` literals in `.tsx` | 2,150 |
| Inline `style={{` occurrences | 7,723 |
| Arbitrary Tailwind values | 5,268 |
| Plain `<img>` | 43 |
| Files importing `next/image` | 6 |

The distribution matters more than the totals:

- `#0067E0` alone appears **490 times** — one token removes ~18% of all raw hex.
- The top five values (`#0067E0`, `#F59E0B`, `#10B981`, `#0F172A`, `#DC2626`) account for **1,168 occurrences**.
- The top 15 files hold **~1,400 of 7,723** inline styles. `PtOsDashboard.tsx` alone has **160**.
- The top 20 `rgba()` values account for **~600 occurrences**, and nearly all map to tokens that already exist or to a small alpha ramp around `--brand`.

### 6.3 The second theme

`src/components/dashboards/PtOsDashboard.tsx` — the authenticated landing page — opens with an "Obsidian / Crimson" hero: an obsidian-to-blue radial field, a gold gradient wordmark, `blur(46px)`/`blur(54px)` glow blobs, and a repeating sheen sweep. It carries 160 inline styles.

It is **not** one of the ten sanctioned decorative themes. Its colours are all palette-legal values (blue-700, gray-900, amber-400/500, blue-300), which is why `palette.test.ts` passes. The drift is that they are spelled as literals and arranged into a second visual language on the first screen every trainer sees — gradient text and a dark/gold theme at once, which is exactly what the audit flags.

### 6.4 Audit findings already on record

`IMPECCABLE-AUDIT.md` (13/20) names the concrete craft failures: plain `<img>` (P1), gradient text (P1), violet/indigo gradients in `finance/record-payment` (P1), side-tab borders (P1), clickable divs (P1), sub-44px targets (P1), bounce easing (P1). These are the same patterns found independently above; they are treated as the checklist for Phase 5, not as the plan itself. The violet/indigo finding is scoped to that one page — it is not a licence to flatten the ten sanctioned decorative themes.

---

## 7. Approaches considered

**A. Rules-first, then sweep — chosen.** Fix the root configuration, add a source-scanning guardrail with a ratchet, codemod the recurring offenders, prove the standard on the shell + trainer home, then sweep the long tail in batches. *Trade-off:* slowest to look different; the only approach where "entire app" is finishable and stays finished.

**B. Reference surfaces first.** Rebuild 8–12 high-traffic screens, propagate afterwards. *Trade-off:* fastest visible payoff, but leaves the 237-file drift untouched and risks the reference surface becoming a one-off.

**C. Audit checklist first.** Burn down the P1 list app-wide, decide on rules later. *Trade-off:* already scoped and measurable, but it is a defect list, not a visual standard; spacing, density, and inline-style drift survive it.

**Why A:** "entire webapp" is only tractable if the finish line is machine-checkable and regression is blocked. B and C are both subsumed into A's later phases rather than discarded.

### 7.1 Decisions taken in conversation

| Decision | Choice |
|---|---|
| Visual direction | Keep the v6.0 identity and converge on it. No new visual direction. |
| Execution approach | A — rules-first, then sweep. |
| Trainer home hero | Light hero, solid wordmark. Founder gold survives as a badge/crest accent only, never as a gradient headline. |
| Dependency bumps | Revert the uncommitted bumps; revisit as a separate project. |

---

## 8. Constraints

- **No new dependencies.** The guardrail is a vitest test, matching the repo's existing source-scanning convention (`form-system-guardrails.test.tsx`, `label-association.test.ts`).
- **Next.js is 16.4.3, not the version in training data.** `AGENTS.md` requires reading `node_modules/next/dist/docs/` before writing code that touches framework APIs. Relevant here: `next/image`'s `priority` is deprecated in favour of `preload` (none of the six existing usages set either), and `loading="lazy"` is the default.
- **The guardrail must not depend on ESLint.** `npm run lint` currently cannot run: the uncommitted dependency bumps move the repo to TypeScript 7, which `typescript-eslint` does not support. This is a Phase 0 decision.
- **`globals.css` and `palette.ts` must stay in parity.** This invariant is documented in `palette.ts`; any token change updates both.
- **`palette.test.ts` is the colour authority and must keep passing.** It already enforces off-palette hex and confines ten decorative theme files. The new guardrail adds literal-vs-token rules and slop patterns; it does not replace or loosen the existing scan.
- **Merge-commit convention**, branches from `main`, one PR per phase or batch.
- **Legitimate dynamic styles stay inline.** A computed width, chart coordinate, or transform is not drift.

---

## 9. Dependency: dashboard correctness

`DASHBOARD-AUDIT.md` documents that the trainer dashboard calls the studio-wide admin endpoint and renders a response shape that does not exist; member dashboard and `/` have related data/error-state failures. This is broken product, not visual craft.

**Out of scope for this design**, but sequenced before Phase 4. The landing-surface work can land presentation changes independently, but the "one product" claim is only credible once the data is right. If the dashboard track slips, Phase 4 ships later, not thinner.

---

## 10. The plan

### Phase 0 — Prerequisites (no UI change)

1. **Revert the uncommitted `package.json` / `package-lock.json` bumps** to the committed versions. This restores CI parity, unblocks `npm run lint`, and removes the six unrelated test failures. The bumps become their own project later.
2. Confirm the dashboard-correctness track is owned and sequenced before Phase 4.

### Phase 1 — Fix the root (~1 small PR)

- Repoint Tailwind's `brand` scale to the `palette.blue` values. Remove the duplicate `surface` colour — it has zero call sites.
- Correct `--rgb-brand` to `0 103 224`.
- Delete `.card.accent-*` and migrate their call sites to spacing/typography/dividers.
- Delete `.page-title` gradient text and `.metric-value.gold/.brand` gradients; use solid tokens.
- Delete `--ease-spring` and replace its four uses (`1034`, `1120`, `1162`, `1486`) with `--ease-out`. There is no documented exception.
- Remove violet/cyan/orange from the Tailwind safelist and the violet glow shadow.

**This phase changes the look of every page that used those utilities — which is the point.** It is one config file plus one CSS file, so it is reviewable.

### Phase 2 — Guardrail (~1 small PR)

**Extend the existing colour guard; do not duplicate it.** `palette.test.ts` already owns "which colours are legal". The new file owns "how colours are referenced" plus the non-colour slop patterns.

- `src/__tests__/design-system-guardrails.test.ts` + `src/__tests__/fixtures/design-baseline.json`.
- Scans `src/app` and `src/components` for: literal hex, `rgb(`/`rgba(`, `bg-clip-text` + `text-transparent`, `border-l-[Npx]` / `borderLeft: 'Npx solid'`, spring cubic-béziers.
- **Ratchet:** each pattern has a baseline number. The test asserts `count <= baseline`. Any increase fails. A failure message lists the top offending files so the fix is obvious.
- **Exemptions must match `palette.test.ts` exactly** — the same ten decorative theme files, plus `src/lib/palette.ts`, `src/lib/brand.ts`, `src/app/globals.css`, test files, `design-prototypes/`, `public/`. A file exempt from one scan and not the other is how two guards drift apart.
- Plain `<img>` is counted for reporting but **not** ratcheted here; it is a Phase 5 checklist item.

### Phase 3 — Mechanical sweep (batched PRs)

- Codemod the top hex values to `brand`/semantic Tailwind classes or `palette.ts` imports.
- Codemod the top `rgba()` values to existing CSS variables; add the missing alpha steps to `globals.css` rather than forcing a variable that means something else.
- Convert **static** inline styles to classes. Leave computed ones.
- Batch by directory (finance, pt-os, settings, member, ai, …), one PR per batch. Each PR lowers the baseline in the same commit.
- PR size target: ≤20 files.

### Phase 4 — Reference surface (~1 PR)

- `AppShell` + `PtOsDashboard`: rebuild the hero on the light v6.0 surface with a solid wordmark. Founder gold survives only in the badge and crest, never as a gradient headline. Remove the sheen sweep and the blur blobs.
- Compose from the UI kit; add loading, error, and empty states.
- This is the proof that the standard is real and achievable, and the pattern the long tail is swept toward.

### Phase 5 — Slop checklist app-wide

The audit P1s that codemods cannot reach, verified by hand:

- **Images:** classify all 43 plain `<img>` by source before changing anything. Supabase URLs and local assets go to `next/image` — relative paths do not need `remotePatterns`, and `loading="lazy"` is already the default. Same-origin `/uploads/*` (5 references) should use `next/image` with `unoptimized` if the route requires the user's cookies: the installed docs state the optimizer does not forward headers when fetching `src`, so a protected route would 401. `unoptimized` keeps the dimension handling and lazy loading. No `next.config.js` change is planned.
- **Clickable divs:** 6 `<div>`/`<span>` → `<button>`, or role + tabIndex + key handling where a button is wrong.
- **Touch targets:** build the inventory by grep (`h-[38px]`, `h-[40px]`, `h-9`, `h-10`, `w-[38px]` on interactive elements), fix to 44px, and record any deliberate exception. No static test; this one is verified by hand.

### Phase 6 — Close out

- Baseline to zero for colour and pattern counts.
- Re-run the impeccable audit; record the new score against 13/20.
- Write `DESIGN.md`: the rule set, the token map, and the "when to break it" exceptions.

---

## 11. Verification

Per batch:

1. `npm run test` — guardrail count must be ≤ baseline, and no existing test may regress.
2. `npm run typecheck`.
3. `npm run lint` (after Phase 0).
4. Visual spot-check of every route the batch touched, light and dark.
5. Baseline JSON updated downward in the same commit.

At close-out: re-run the audit and compare against the 13/20 baseline.

---

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Codemods touch computed/dynamic styles and cause visual regressions | Never codemod a computed value; batch by directory; spot-check changed routes |
| 2,150 `rgba()` literals include values with no matching token | Add the missing alpha step to `globals.css`; do not repurpose an existing token that means something else |
| Repointing Tailwind `brand` changes every `brand-*` class at once | It is the intended fix and currently affects only 4 real call sites; diff is one file |
| Guardrail baseline is set too low and blocks legitimate work | Baseline starts at measured counts and only ratchets; exceptions are documented, not silent |
| Phase 4 depends on dashboard data fixes | Sequence explicitly; ship presentation later rather than thinner |
| The sweep stalls halfway | The ratchet makes partial progress visible and prevents backsliding; the definition of done is per-pattern, so patterns can close independently |
| The new guardrail and `palette.test.ts` disagree on exemptions and break `npm test` | Both scans share one exemption list; Phase 2 asserts parity against the existing test |
| `/uploads/*` images break when moved to `next/image` behind auth | Classify by source first; keep the plain-`<img>` path where cookies are required |
| Reverting the dependency bumps discards work someone still wants | Confirm the tree is clean of intentional upgrade work before discarding; the bumps are recorded as a separate project |

---

## 13. Calls made by the designer (not the user)

- Guardrail as a vitest source-scan rather than an ESLint plugin — matches house convention and avoids the TS 7 blocker.
- **Extend `palette.test.ts` rather than add a second hex scan.** The existing test is the colour authority and already documents ten sanctioned decorative themes.
- **Do not flatten the ten sanctioned decorative themes** (member portal, landing, visualizations, exercise-library regions, Today card, profile, attendance, fitness testing, Command Center, founder gold). They are deliberate, confined to one token file each, and test-enforced. The sweep targets literal palette values in ordinary components.
- Ratchet-with-baseline rather than allowlist-by-path — allowlists never shrink.
- Ban colour/radius/shadow/motion literals, **not** all arbitrary values. `h-[44px]` is the documented touch-target convention and must survive. Font-size arbitrary values are also left alone; they are widespread and the audit did not find them a problem.
- Touch targets are a checklist item, not a machine-enforced one — no reliable static measure exists across 320 components.
- `/uploads/*` stays plain `<img>` where auth requires it; no `next.config.js` change.
- Remove `--ease-spring` outright; replace all four uses with `--ease-out`.
- Remove the unused Tailwind `surface` colour (zero call sites).
- Dark mode is touched-surfaces-only, not a full pass.
- `DESIGN.md` at the end, not the start; the design doc is the interim source of truth.

---

## 14. Left to the builder

- Codemod tooling: `ast-grep` (installed at `/usr/bin/sg`) versus a one-off Node script in `scripts/`. Either is acceptable; the choice should favour reviewable diffs.
- Exact batch boundaries and PR order within Phase 3.
- Whether to add semantic Tailwind colours bound to CSS variables, or keep using `[var(--token)]`. Add only if it removes more code than it adds.
- Baseline JSON shape and the precise regexes.
- Whether the Phase 5 image migration needs a shared wrapper component or can stay per-site.
