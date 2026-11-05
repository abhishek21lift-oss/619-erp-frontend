# Workout Log + Progress Hub Redesign — Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` (native) or
> `superpowers:subagent-driven-development`. Steps use `- [ ]`.

**Goal:** Put the client Workout Log and the Progress Hub on the shared compact
hero and the app's premium, colourful Apple-style card/tile language without
changing any data or behaviour.

**Architecture:** Presentation only. Both screens keep their existing state,
queries, handlers and copy. `PageHero compact` supplies the header; the leads
KPI tile (white card, accent hairline, gradient icon tile, tight numeral) is the
reused card recipe. Colour comes from `lib/palette.ts` values only, so the
palette scan and its confinement guards are untouched.

**Tech Stack:** Next.js App Router, React 19, Tailwind utility classes plus
inline styles, framer-motion `m`, lucide icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-05-workout-log-progress-hub-redesign.md`

## Global Constraints

- No new dependencies, routes, API calls, migrations or theme files.
- Existing copy that tests assert must stay (roster name, "18 days overdue",
  "1 assessment", `/^Overdue/` button).
- Hex values only from `lib/palette.ts`; no new decorative theme directory.
- Light-first; dark mode via `--bg-card`, `--bg-subtle`, `--border`,
  `--text-*` tokens, never a fixed light surface.
- Touch targets ≥40px; active states use `aria-pressed` / `aria-selected`.
- No commits (repo rule: commit only when asked).
- No `SpotlightCard` usage left if the import becomes dead.

## Tasks

### Task 1: Workout Log page

**Files:** `src/app/(chrome)/pt-os/clients/[id]/workout-log/page.tsx`

1. Replace the bespoke amber hero block with `PageHero compact` inside
   `PageContainer className="max-w-4xl"`; keep `PullToRefresh`, the New Session
   handler and the loading/error branches.
2. Extract the six primary KPIs into an accent-tile map (white card, 3px top
   hairline, 40px gradient icon tile, `AnimatedCounter`, uppercase label).
   Accents: rose sessions, emerald completion, orange volume, amber duration,
   mint streak, deep plum PRs.
3. Turn the range presets into a segmented track with a brand-filled active
   segment; keep the custom date fields and the range summary line.
4. Restyle the secondary KPI row as one grouped inset stat strip.
5. Restyle the analytics/section cards, active-plan strip, exercise-progress
   card, history card and heatmap with the house radius, tinted shadow and
   gradient section icons. Switch chart series to palette accents.
6. Restyle session rows with a status-tinted date tile and chevron; keep the
   timeline and calendar behaviour, brand-fill the selected calendar day.
7. Update the silent-catch ratchet line for this file if the line moved.

**Verify:** `npx tsc --noEmit`; ESLint on the file; `npx vitest run
src/__tests__/workout-log-analytics.test.ts
src/__tests__/palette.test.ts src/__tests__/page-shell.test.ts
src/__tests__/form-system-guardrails.test.tsx
src/__tests__/silent-catch-ratchet.test.ts`.

### Task 2: Progress Hub page

**Files:** `src/app/(chrome)/pt-os/progress/page.tsx`

1. Roster: `PageHero compact`; four semantic accent tiles (red overdue, amber
   due, rose upcoming, slate no-cycle); iOS-style filter track with active
   brand fill; grouped client rows with a state-coloured left edge, avatar,
   meta and chevron. Keep every asserted string.
2. Hub: `PageHero compact`; light-surface no-baseline chip; per-section tab
   tones with coloured inactive icons (AA text tones) and gradient active fill.
3. Restyle the re-test card to the house brand gradient; give `Stat` an accent
   hairline derived from its existing `tone`; move `Panel` to the house card
   radius/shadow.
4. Shrink `LoadingShell` to the compact header height.
5. No behaviour, query or copy change.

**Verify:** `npx tsc --noEmit`; ESLint on the file; `npx vitest run
src/__tests__/progress-retest-roster.test.tsx
src/__tests__/palette.test.ts src/__tests__/page-shell.test.ts`.

### Task 3: Whole-change check

- `npx tsc --noEmit`
- ESLint on both changed files
- `npx vitest run` for both files' relevant suites + palette + page-shell +
  form-system + silent-catch
- `git diff --check`; review the diff for accidental copy/logic changes
- Browser check at 390px and desktop only if a seeded stack is available;
  otherwise state that it was not run.

## Review Focus

- Long client names in the compact hero must truncate, not push the action off
  screen.
- 320–390px: six KPI tiles in two columns must not clip `12.3k kg`; the
  six-segment range control must not overflow.
- Dark mode: active segmented/tab text must stay readable and cards must use
  tokens.
- Roster test strings and filter accessible names must survive.
- Silent-catch line numbers must still match the file after edits.
