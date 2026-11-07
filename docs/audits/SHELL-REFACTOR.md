# Shell refactor — done

Status: **executed.** This file is kept as the record of what changed and, more
usefully, of the two things the plan got wrong — both of which would have
shipped a broken app.

`AppShell` used to be rendered by each page:

```tsx
export default function SomePage() {
  return <Guard><AppShell>…</AppShell></Guard>;
}
```

React cannot reconcile two different page subtrees, so every client-side
navigation destroyed the whole shell and rebuilt it: the bottom nav's
`layoutId` pill re-initialising, notifications refetched per route change, and
an `AnimatePresence` page transition that could never play an exit because the
tree carrying it was destroyed first.

It now comes from `src/app/(chrome)/layout.tsx` and is mounted once per
session. Route groups do not appear in URLs, so which chrome a page gets is
decided by which folder it lives in, at build time — no pathname matching, and
no special case for `/`, which is listed in `SESSIONLESS_PAGES` and is also the
main dashboard.

```
src/app/
  (chrome)/layout.tsx      ← <Guard><AppShell>{children}</AppShell></Guard>
  (chrome)/…               104 pages
  (bare)/…                  17 pages
```

## What the plan got wrong

**1. Eight chromed routes looked bare.** The plan read `<AppShell>` out of each
`page.tsx` and concluded the seven `[tab]` workspaces and `/appointments` had
no chrome. They render `ModuleWorkspace`, which mounted `Guard + AppShell`
itself. Filed under `(bare)` they would have lost the sidebar, the top bar and
the bottom nav outright. `ModuleWorkspace` now renders neither — it keeps only
its per-config role `Guard`, and those eight pages sit under `(chrome)` with
everything else.

**2. `/subscription` genuinely cannot inherit a shell.** A frozen studio gets a
standalone full-bleed lockout, deliberately without nav, because every other
endpoint answers 402 and redirects straight back to it. Under `(chrome)` that
branch would render inside the shell it exists to escape. It is the one staff
route still under `(bare)`, mounting `AppShell` itself.

## Also changed, and why

- **`title` / `headerLeft` props are gone from `AppShell`.** A layout knows
  nothing about the page inside it. `headerLeft` had no callers at all; `title`
  had five, which now render `<PageTitle>` — the same `h1`, character for
  character.
- **Every `error.tsx` under `(chrome)` passes `shell={false}`.** Their layout
  has already rendered `Guard + AppShell` around whatever the boundary returns,
  so `shell` would nest a second copy of the entire app inside the first. The
  root `src/app/error.tsx` still passes it: that boundary sits *above* the
  `(chrome)` layout, so nothing has drawn the chrome when it renders.
- **The page transition still has no exit animation.** The `AnimatePresence
  mode="popLayout"` wrapper was removed rather than left to come alive. It had
  never run once, and turning it on now — with the exiting page absolutely
  positioned over the arriving one — is a UI change, not part of moving the
  shell.
- **Tests resolve routes through `src/__tests__/helpers/app-routes.ts`.** Twenty
  test files joined URLs onto `src/app` to read a page's source. They ask the
  helper now, so moving a page between groups does not edit tests that have
  nothing to do with chrome.

## What proved it

- `next build`'s route list is **identical** before and after — 126 routes,
  byte for byte. This is what shows no URL moved.
- `src/__tests__/route-groups.test.ts` pins group membership against the
  pre-refactor list, and asserts no page under `(chrome)` mounts `AppShell`.
  Both were checked by deliberately breaking them.
- `tsc --noEmit` clean; ESLint unchanged at 0 errors / 199 warnings; the full
  Vitest suite green.

Static verification only — there is no browser in the agent sandbox. Navigation
between routes is worth a click-through on a device.
