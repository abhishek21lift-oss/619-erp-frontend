# Client profile — premium Apple pass

## Intent

`/pt-os/clients/[id]` is the page a trainer opens most often. Two asks:

1. Its hero must match the rest of the webapp's heroes. The dashboard and every
   `PageHero` page open on the house navy (`#0F172A` → `#0050AD`) with gold and
   blue light; this page was the only one wearing the profile spectrum's
   indigo→pink mesh.
2. The page should read as premium, colourful and Apple — glass cards, tinted
   depth, the spectrum kept for decoration only.

## Decisions (defaults — the questions were skipped)

- **Hero paint = the house hero, character for character.** Base gradient,
  crown radial, gold + blue glows, 34px grid, spotlight vignette, house
  shadow. No sheen loop: `PageHero`'s own reasoning is that a perpetual
  animation belongs on the landing page, not on every page.
- **Glows stay background layers, never blurred children** — the existing
  comment's iOS Safari warning (a filtered child escapes the rounded clip).
- **`navyHero` token in `profileTheme.ts`.** That file is already exempt from
  the palette hex scan and already confined to this page by `palette.test.ts`.
  `heroMesh` stays untouched — My Profile keeps its own hero.
- **Body depth = the app's adaptive glass tokens** (`var(--glass-shadow)` +
  `var(--glass-ring)`), plus a tone-tinted glow per card. The old shadow was
  one hard-coded light-only `rgba(15,23,42,…)`, which does nothing in dark
  mode and reads flat in light.
- **Nothing else moves.** No content, route, API, data, layout or copy changes.
  No new dependencies. The hero keeps its 32px radius and all of its content
  (avatar, name, status, CopyId, Edit, three stats) — the DOM is pinned by
  tests.

## Risks

- `silent-catch-ratchet` pins one `path:line` in this file by line number. The
  entry is expected to move and is updated; the per-file count must stay 1.
- The money-strip source pins (`client-term-money-cards`) are untouched — the
  `MEMBERSHIP` / `CLIENT LOGIN` comment markers stay in place.
- `heroMesh` leaves this page's import; the import line is updated so no
  unused import slips in.

## Tasks

1. `profileTheme.ts` — add `navyHero`.
2. `page.tsx` hero — house paint + grid/vignette + comment.
3. `page.tsx` cards — adaptive glass shadow + tint depth (`SectionCard` + the
   two standalone nav cards).
4. New source pin test.
5. Gates: `tsc`, eslint, affected suites, full vitest, build.
