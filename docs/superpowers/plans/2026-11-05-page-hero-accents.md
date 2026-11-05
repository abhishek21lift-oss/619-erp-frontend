# Page Hero Accents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give four pages their own two-stop hero colour without changing the other 79 pages that render `PageHero`.

**Architecture:** A new token file `components/ui/pageAccents.ts` holds five named two-stop gradients (brand + four sections). `PageHero` gains an optional `accent` prop that paints either the full hero or the compact header from it; omitted, the existing house rose literal is untouched. `ClientPicker` passes the accent through, so only the Workout Log landing changes out of the 22 pickers. The member Form check page moves to its own existing `PageTitle` accent.

**Tech Stack:** Next.js App Router, React, TypeScript, framer-motion, Vitest.

**Spec:** approved in-session short design (2026-11-05), no separate spec file.

## Global Constraints

- Default `PageHero` output must not change: `client-profile-premium.test.ts` pins the literal `linear-gradient(128deg, #6B2440 0%, #A33757 46%, #852E4E 100%)` inside `PageHero.tsx`.
- Every accent's `to` stop carries white 12.5px text, so it must clear 4:1.
- New hexes live only in `components/ui/pageAccents.ts`; `palette.test.ts` and `design-system-guardrails.test.ts` scan every other file.
- Do not touch `src/app/(chrome)/pt-os/clients/[id]/workout-log/page.tsx` — it has uncommitted user work.

## Review Focus

- A page passing an unknown accent string must still type-check only through the union; a typo must be a build error, not a silent rose hero.
- `compact` without `accent` must keep its current transparent, dark-text header — 20+ pages rely on it.
- Dark mode: accent heroes are saturated in both themes, so text stays white; no `--text-*` token may leak into a painted header.
- `surface` (Attendance) must keep winning where both props are present — it is the older, more specific escape hatch.
- Screen readers: the painted compact header must keep exactly one `<h1>` and the same tab order as the unpainted one.

---

### Task 1: Accent tokens + `PageHero` support

**Files:**
- Create: `src/components/ui/pageAccents.ts`
- Modify: `src/components/ui/PageHero.tsx`
- Modify: `src/components/ui/index.ts`
- Test: `src/__tests__/page-hero-accent.test.ts`

**Interfaces:**
- Produces: `type PageAccent = 'brand' | 'amber' | 'indigo' | 'red' | 'teal'`; `PAGE_ACCENTS: Record<PageAccent, { from: string; to: string; shadow: string }>`; `pageGradient(a: PageAccent): string`; `PageHeroProps.accent?: PageAccent`.

- [ ] **Step 1: Write the failing test** — assert `PAGE_ACCENTS` has the five keys, every `from`/`to` matches `/^#[0-9A-F]{6}$/i`, `pageGradient('amber') === 'linear-gradient(135deg, #B45309, #92400E)'`, and `PageHero.tsx` contains both the house literal and `pageGradient(accent)`.
- [ ] **Step 2: Run it** — `npx vitest run src/__tests__/page-hero-accent.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** — token file; `accent` prop; `paint = accent !== 'brand' ? { background: pageGradient(accent), shadow: PAGE_ACCENTS[accent].shadow } : surface`; full hero uses `paint`; compact branch paints a `rounded-[20px]` band with white text and a glass icon tile when `accent` is set.
- [ ] **Step 4: Run it** → PASS.
- [ ] **Step 5: Commit** — not requested; leave the diff for the user.

### Task 2: Wire the four pages

**Files:**
- Modify: `src/components/pt-os/shared/ClientPicker.tsx` (accent passthrough)
- Modify: `src/app/(chrome)/pt-os/workout-log/page.tsx` → `accent="indigo"`
- Modify: `src/app/(chrome)/pt-os/leads/page.tsx` → `accent="amber"` on the compact hero
- Modify: `src/app/(chrome)/pt-os/clients/at-risk/page.tsx` → `accent="red"`
- Modify: `src/app/(bare)/member/form-check/page.tsx` → `accent="workout"` → `accent="progress"`

- [ ] **Step 1: Add page assertions to the same test** — each file contains its accent, and no other `ClientPicker` caller passes one.
- [ ] **Step 2: Run it** → FAIL.
- [ ] **Step 3: Implement the five edits.**
- [ ] **Step 4: Run it** → PASS.

### Task 3: Guards

**Files:**
- Modify: `src/__tests__/helpers/token-files.ts` (add `components/ui/pageAccents.ts`)
- Modify: `src/__tests__/palette.test.ts` (confinement test)

- [ ] **Step 1: Add the path to `DECORATIVE_THEME_PATHS` and a test that files importing `pageAccents` are exactly `components/ui/PageHero.tsx` and `components/ui/index.ts`.**
- [ ] **Step 2: Run `npx vitest run src/__tests__/palette.test.ts src/__tests__/design-system-guardrails.test.ts src/__tests__/page-shell.test.ts src/__tests__/client-profile-premium.test.ts`** → PASS.
- [ ] **Step 3: `npx tsc --noEmit` and ESLint on the changed files** → PASS.
