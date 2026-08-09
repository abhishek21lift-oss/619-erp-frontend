# Shell refactor plan — stop `AppShell` remounting on every navigation

Status: **designed and validated, not yet executed.**

This is the remaining half of BUG-002 from the audit. The design work and the
feasibility checks are done and written down here so the execution is
mechanical. It is written down at all because the last plan this codebase
referenced — `TENANT-RLS-PLAN.md`, cited from `src/db/pool.js` and migration
157 in the backend — was never actually written, and the cutover it described
has been stalled ever since.

---

## The problem

`AppShell` is rendered by **97 individual pages**, not from a layout:

```tsx
export default function SomePage() {
  return <Guard><AppShell>…</AppShell></Guard>;
}
```

React cannot reconcile two different page subtrees, so on every client-side
navigation the entire shell — sidebar, top bar, bottom nav — is destroyed and
rebuilt. That produces:

- the bottom bar briefly vanishing, and its `layoutId` active pill
  re-initialising (visible as a jump)
- notifications refetching on every route change
- every page's mount animation replaying
- the `AnimatePresence mode="popLayout"` page transition inside `AppShell`
  being unable to ever play an exit animation, because the tree carrying it is
  destroyed first — dead code paying a cost

**Already fixed separately (PR #112), do not redo:** the scroll-driven 60fps
re-render of the whole shell, and `NavScrollProvider` remounting (which reset
`topBar` and snapped `--topbar-h` 32px→46px on arrival at every route). Those
were the causes of the *movement*. What remains here is the *remount*.

---

## Two traps found the hard way

Check both against any implementation before trusting it.

### 1. `/` is listed as sessionless AND renders the full shell

```
src/lib/public-paths.ts →  SESSIONLESS_PAGES includes '/'
src/app/page.tsx        →  <Guard><AppShell>…</AppShell></Guard>
```

The obvious gate — "render the shell everywhere except public pages" — strips
the chrome off the main dashboard, the most-visited page in the app. Any
pathname-based gate must special-case this.

### 2. 24 pages currently render no shell at all

Under any gate that defaults to "shell on", every one of these silently
*gains* chrome. They must all keep having none:

| Category | Routes |
|---|---|
| Auth / public (7) | `/login`, `/member-login`, `/forgot-password`, `/reset-password`, `/auth/set-password`, `/client/activate`, `/start-free` |
| Member portal (3) | `/member/dashboard`, `/member/classes`, `/member/payments` |
| `[tab]` workspaces (7) | `/attendance/[tab]`, `/engagement/[tab]`, `/finance/[tab]`, `/insights/[tab]`, `/reports/[tab]`, `/settings/[tab]`, `/training/[tab]` |
| Other (7) | `/[...slug]`, `/admin/dashboard`, `/appointments`, `/attendance/reports`, `/pt-os`, `/pt-os/pdf-viewer`, `/subscription/checkout/[id]` |

The `[tab]` pages are **not** redirects — they render `ModuleWorkspace`, which
brings its own chrome. Giving them `AppShell` would double it.

---

## Recommended approach: route groups

Route groups (`(name)/`) do not affect URLs, so chrome is decided by which
folder a page lives in — no runtime gate, no pathname matching, no
special-casing of `/`. Both traps above disappear by construction.

```
src/app/
  (chrome)/layout.tsx      ← renders <AppShell>{children}</AppShell>
  (chrome)/…               ← the 97 pages that have chrome today
  (bare)/…                 ← the 24 that do not
```

### Validated as feasible

- **0 relative imports** in any `page.tsx` (`grep -rn "from '\.\./" src/app
  --include="page.tsx"` → 0). Everything uses the `@/` alias, so moving
  folders cannot break imports.
- Only **1 of `AppShell`'s 8 state values** (`refreshKey`) relates to page
  content; the other 7 are chrome. So `AppShell` moves wholesale — it does not
  need splitting.

### The awkward part

~10 folders are **mixed** — they contain both shell and no-shell pages as
siblings, so the folder cannot move as a unit:

`attendance`, `finance`, `settings`, `reports`, `insights`, `training`,
`engagement`, `pt-os`, `admin`, `subscription`

Next.js permits the same URL prefix in two groups
(`(chrome)/attendance/page.tsx` alongside `(bare)/attendance/reports/page.tsx`),
so these are split per-subfolder. This is the fiddly, must-be-careful part.

---

## Execution order

1. Capture the **current route list** from `npm run build` output. This is the
   before-image for step 6 and the whole safety net — do not skip it.
2. Create `src/app/(chrome)/layout.tsx` rendering `<AppShell>`.
3. `git mv` the unmixed folders into `(chrome)` / `(bare)`.
4. Split the ~10 mixed folders per-subfolder.
5. Strip `<AppShell>` (and its now-unused import) from the 97 pages. Note
   **9 pages render it in more than one return branch** — loading/error/content
   — so strip every occurrence, not the first:
   `weekly-checkin`, `clients/[id]/edit`, `trainer/dashboard`,
   `finance/payment-settings`, `pay/[orderId]`, `trainers/[id]/edit`,
   `trainers/[id]`, `settings/profile`, `subscription`.
6. **Diff the new build's route list against step 1. It must be identical.**
   This is what proves no URL moved.
7. Handle the 5 pages passing `title` / `headerLeft` to `AppShell` — either a
   small context the page sets, or let those pages render their own heading.

## Verification

Static only; there is no browser in the agent sandbox. Whoever executes this
should also click through on a device.

- Build route list identical before/after (step 6) — the load-bearing check.
- A test asserting chrome status per page matches the pre-refactor state:
  every page under `(chrome)` used to contain `<AppShell>`, and every page
  under `(bare)` did not. That reproduces today's behaviour by construction.
- `tsc --noEmit`, `eslint`, full Vitest suite, `next build`.

## Is it worth doing?

The *movement* symptoms are already fixed (PR #112). What is left is a brief
blink on route change plus a redundant notification fetch per navigation. That
is real but cosmetic, and the fix is a large restructure — so this is a
deliberate, scheduled piece of work, not an emergency. Do it with a clean
context and a device to check it on.
