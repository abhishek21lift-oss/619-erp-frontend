# Member profile — Release 1 "Impress" design

Date: 2026-11-13
Status: awaiting approval
Scope: `619-erp-frontend` member portal only. No backend, API, or auth changes.

## Intent

Make the member profile feel like a native iOS screen in the first five seconds.
Release 2 will build the habit loop (streak ritual, trophy case, weekly nudge);
this release builds the visual shell that loop will live in.

## Goals

- `/member/more` gets an iOS-style collapsing header: transparent at the top,
  blurred bar with the page title once the hero scrolls under it.
- The hero gets a restrained scroll-linked depth (slight shrink, dimmed glows).
- Sessions / streak / PRs count up once on entry, not perpetually.
- Members can pick Light or Dark in Account, persisted across reloads.
- Member skeletons shimmer instead of pulsing.
- Press states and success haptics are consistent.

## Non-goals

- **System theme option.** ThemeProvider's type is the resolved value, and the
  pre-paint script reads a single `theme` key. Supporting "system" means
  touching shared theme code used by the staff app. Deferred; Light/Dark ships.
- **Bottom sheet for photo actions.** The existing `Dialog` is accessible and
  works; a sheet primitive is new work for little gain.
- **New gradients, saturated surfaces, or perpetual animation.** DESIGN.md
  limits those to the member hero, plan card, and recap tile.
- **Habit features** (streak CTA, trophy case, push nudges) — Release 2.
- **Auth screens or flows** — authentication freeze stands.

## Constraints

- Motion ease is `[0.16, 1, 0.3, 1]`; `useReducedMotion()` must produce a static,
  fully readable result.
- MemberShell owns the top inset. The sticky header lives inside the page and
  pays `env(safe-area-inset-top)` itself when pinned.
- `memberTheme.ts` stays decorative; status colours stay in the palette.
- Tests mock MemberShell as a fragment, so nothing may depend on MemberShell
  internals.
- Reuse only: framer-motion, `TriggerHaptic` helper, `components/ui/Skeleton`,
  existing `useTheme`. No new dependencies.

## Approaches considered

1. **CSS-only title change on scroll.** Cheap, no listeners, but no coordinated
   blur/title reveal; reads as a colour swap, not a native header. Rejected.
2. **framer-motion `useScroll` + `useTransform` inside the page.** Contained to
   one page, reuses the existing motion stack, easy to make static for reduced
   motion. **Chosen.**
3. **Web Animations API.** No advantage over the installed library. Rejected.

## Design

### 1. Collapsing header (`more/page.tsx`)

- In-flow `sticky top-0 z-30` bar inside the page, full column width via
  `-mx-4 px-4`, `paddingTop: env(safe-area-inset-top)`.
- At scroll 0: transparent, no border, title at opacity 0.
- Over the first ~72px of scroll: background becomes the canvas colour at ~92%
  opacity with `backdrop-blur`, a 1px bottom border fades in, and "Profile"
  fades/slides in.
- The bar holds the page's single `<h1>Profile</h1>`; it is always in the
  accessibility tree.
- `useReducedMotion()`: no scroll transforms; bar is solid with the title
  visible from the start, hero unscaled.
- Scroll is the window (MemberShell creates no scroll container); no
  `headerPaysTopInset` change needed.

### 2. Hero depth

Wrap the existing hero in a motion wrapper whose `scale` goes 1 → 0.97 and `y`
0 → 6 over the first ~160px, with the two glow spans dimming slightly. The
hero's existing entrance animation stays as is (it only animates y/opacity).
Static under reduced motion.

### 3. Count-up stats

Move the local `CountUp` from `RecapStory.tsx` into `MemberUI.tsx` as an export
(one implementation, one behaviour), and use it in `HeroStat`. Duration 1.1s,
existing ease; reduced motion renders the final value immediately. `undefined`
still renders "—", never 0.

### 4. Appearance (Account)

New "Appearance" section in `/member/account` with a two-option segmented
control (Light / Dark) using `useTheme().theme` and `setTheme`. Buttons are
`aria-pressed`, 44px targets, with Sun/Moon icons. Persistence is already
handled by ThemeProvider (`localStorage.theme` + class/attribute) and read by
`public/theme-init.js` before first paint — no changes there.

### 5. Skeleton shimmer

`MemberUI.PageSkeleton` swaps its `animate-pulse` blocks for the existing
`components/ui/Skeleton` (already shimmers). Placeholders drawn on the mesh
hero keep their white translucent pulse.

### 6. Press states and haptics

- Audit primary member buttons for `active:scale-[0.98]` where missing
  (photo, save contact, change password, sign out). Secondary rows already
  have an active background.
- `triggerHaptic(8)` on two success moments only: photo saved and password
  changed. No haptics on navigation rows.

## Files

- `src/app/(bare)/member/more/page.tsx` — header, hero wrapper, CountUp.
- `src/components/member/MemberUI.tsx` — export CountUp; Skeleton in PageSkeleton.
- `src/components/member/RecapStory.tsx` — import CountUp instead of local copy.
- `src/app/(bare)/member/account/page.tsx` — Appearance card, press states, haptics.
- `src/__tests__/member-more-page.test.tsx` — header/heading and unchanged data.
- `src/__tests__/member-appearance.test.tsx` — new; toggle calls `setTheme`.

## Verification

- `npx vitest run src/__tests__/member-more-page.test.tsx src/__tests__/member-appearance.test.tsx`
- `npm run typecheck`
- `npx eslint "src/app/(bare)/member/more/page.tsx" "src/app/(bare)/member/account/page.tsx" src/components/member/MemberUI.tsx src/components/member/RecapStory.tsx`
- Manual: `npm run dev` at 390px; scroll profile, toggle both themes, emulate
  `prefers-reduced-motion: reduce`, confirm no layout shift or invisible text.
- No commit without explicit permission.
