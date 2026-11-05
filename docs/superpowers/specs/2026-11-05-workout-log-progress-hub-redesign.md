# Workout Log + Progress Hub — premium Apple-style redesign

Status: approved 2026-11-05 (user confirmed the short design in chat).

## Intent

Two client-scoped trainer screens look older than the rest of the studio: the
client Workout Log carries a bespoke amber hero that matches no other page, and
the Progress Hub is still on the full navy hero plus flat stat chips. Bring both
onto the house header and the polished, colourful Apple-inspired treatment the
profile, leads and workout-plans screens already use.

## Goals

- Workout Log gets the shared `PageHero compact` and a colourful, premium KPI
  row, segmented range control, section cards and session rows.
- Progress Hub gets the same header treatment, semantic colourful stat tiles,
  per-section tab colours, a brand re-test card and consistent card surfaces.
- Mobile-first: 2-up KPI grids on phones, 3–4 across from `sm`.
- Keep every existing number, label, chart, API call and guard intact.

## Non-goals

- No new data, routes, endpoints or permissions.
- No tenancy, auth or backend change.
- No new decorative colour theme file: the existing eight-family palette has
  enough hues, so the palette scan and its confinement tests stay as they are.
- Not touching the shared `ClientPicker` (ten tools use it) or the session
  detail page.

## Anti-goals

- A second page-specific hero colour.
- Decorative colour on a state (red stays error/overdue, amber stays warning,
  emerald stays success).
- Shrinking controls or text to buy density.

## Approaches considered

1. **Reuse house header + existing card/tile recipe (chosen).** `PageHero
   compact` is already the rule for list pages (`pt-os/leads`, AI pages,
   WhatsApp). The leads KPI tile — white card, accent hairline, gradient icon
   tile, oversized tight numeral — is the shipped Apple-style pattern. Smallest
   diff, no new tokens, no guard changes.
2. New `workoutLogTheme.ts` / `progressTheme.ts` module palettes. Would give more
   hues, but duplicates an existing style and needs `DECORATIVE_THEME_PATHS`
   plus a new confinement test for decoration these pages do not need.
3. Keep the full navy hero and restyle content only. Rejected: the user asked
   for the compact hero on Workout Log, and DESIGN.md says operational screens
   should not spend ~200px of hero above the workflow.

## Design

### Workout Log (`app/(chrome)/pt-os/clients/[id]/workout-log/page.tsx`)

- `PageHero compact`: Dumbbell icon, client name as title, `Workout Log ·
  <active plan or Freestyle>` as subtitle, `New Session` action.
- KPI row below the hero: six `SpotlightCard`s restyled as Apple tiles (white
  surface, 22px radius, 3px accent hairline, 44px gradient icon tile, 28px
  tight numeral). Accents: rose sessions, emerald completion, orange volume,
  amber duration, mint streak, deep plum PRs. `AnimatedCounter` kept.
- Range presets: iOS segmented control — `--bg-subtle` track, active thumb
  `--bg-card` with a soft shadow and brand text; `aria-pressed` kept.
- Section cards: 24px radius, `0 1px 2px + tinted wide` shadow, gradient
  section icon tiles (Training volume rose, Sessions emerald, Exercise
  progress amber, History orange/plum, Heatmap mint).
- Active plan becomes a brand-gradient strip with glass icon and white progress
  bar.
- Session list rows become grouped white rows: rounded date tile, name + meta,
  status pill, chevron. Timeline and calendar keep their behaviour, with the
  calendar selected day switching to the brand fill.
- All logic, queries, copy, empty/error states and test hooks unchanged.

### Progress Hub (`app/(chrome)/pt-os/progress/page.tsx`)

- Roster: `PageHero compact`, four semantic KPI tiles (overdue red, due amber,
  upcoming rose, no open cycle slate), iOS filter pills with counts, client
  rows restyled as grouped cards. Existing text kept for
  `progress-retest-roster.test.tsx`.
- Client hub: `PageHero compact`; tab pills get a per-section gradient icon and
  a filled gradient active state (rose overview, amber history, emerald
  comparison, mint calendar, orange journal, light rose analytics, slate
  insights). No semantic colour is used to mean "just a tab": the icon carries
  the hue; the active fill is decoration.
- Overview: re-test card in the house brand gradient with glass pills; stat
  chips get accent hairlines and gradient icons; `Stat` gains its gradient from
  its existing `tone` prop, so comparison/history panels pick the same look up
  without new call-site props.
- `Panel` keeps its API; radius/shadow/title weight move to the house card
  scale. Tables, forms, journal and analytics logic untouched.

## Constraints

- Light-first; dark mode uses `--bg-card`/`--border`/`--text-*` tokens, no
  fixed white surfaces behind text without a token.
- Existing palette hexes only (`lib/palette.ts`).
- Contrast: coloured tiles are white-on-gradient icon chips only; text stays on
  semantic tokens. Active segmented/tab text is white on the brand/own gradient
  and carries a non-colour state (`aria-pressed` / `aria-selected`).
- Reduced motion respected through existing `m` usage; no new perpetual motion.
- Touch targets stay ≥ 40px; the existing 44px calendar cells stay.

## Verification

- `npx tsc --noEmit`
- Targeted ESLint on both files
- `npx vitest run src/__tests__/progress-retest-roster.test.tsx
  src/__tests__/workout-log-analytics.test.ts
  src/__tests__/palette.test.ts src/__tests__/page-shell.test.ts
  src/__tests__/form-system-guardrails.test.tsx
  src/__tests__/silent-catch-ratchet.test.ts`
- Browser check of both pages at 390px and desktop if a seeded stack + login is
  available; otherwise state the limitation.

## Left to the builder

- Exact accent assignment per section.
- Whether the Progress Hub roster and hub share one hero component call (they
  do: same props, different subtitle/actions).
