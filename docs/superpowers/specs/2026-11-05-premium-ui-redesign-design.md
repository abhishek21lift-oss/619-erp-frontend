# Premium UI redesign — Clients, Leads, Messages

- Status: proposed (awaiting approval)
- Date: 2026-11-05
- Scope: `619-erp-frontend` only. No backend, DB, API or dependency changes.

## Intent

The owner wants four things:

1. The dashboard's **Active Clients** KPI must open the client list already
   filtered to active clients, not the unfiltered roster.
2. **All Clients** and **Leads** get a more premium, colourful, Apple-style
   treatment while staying recognisably this app.
3. The **Add Lead form** is the cleanliness benchmark: the rest of the app
   should feel as calm and as easy to scan.
4. **Member messages** should feel like a real chat screen, not a page with a
   conversation in it.

## What exists today (verified)

- `/` Active Clients tile links to `/pt-os/clients` with no filter
  (`PtOsDashboard.tsx:2393`). The list endpoint already accepts `status`, and
  `/pt-os/clients` already maps its pills through `serverFilter()`; it just
  never seeds the pill from the URL.
- `/pt-os/clients` is a full `PageHero` + a four-cell KPI strip + a `<table>`
  roster. The table is functional but reads as a spreadsheet, and avatar
  colours are indexed by row position, so they reshuffle on filter.
- `/pt-os/leads` is a compact amber `PageHero` + four KPI tiles + a funnel
  chart + a second chart data table + search + pills + lead cards. The list,
  which is the point of the page, starts below all of it.
- `/pt-os/messages` is a real two-pane inbox around `ChatThread`; `/member/messages`
  is a single thread under a large gradient hero. Both poll, mark read,
  optimistically send and retry — the behaviour is already right.
- The Add Lead page is one card, three short field groups, hairline group
  rules, floating labels, a pinned action bar, no helper copy.

## Constraints (verified in the repo)

- One shared header: `PageHero` / `PageContainer` / `PageActions`. Only the
  dashboard keeps its own hero (`MEMORY.md` §9).
- Colour comes from `lib/palette.ts` (eight families) and the CSS state
  tokens. New hexes fail `palette.test.ts`; the literal-hex and literal-rgba
  baselines only ratchet down.
- `scale.test.ts` caps distinct font sizes at 40 and radii at 29. The
  redesign must reuse existing values, not invent new ones.
- `page-shell.test.ts` pins `PageContainer` to the dashboard container.
- The funnel chart's data shape is pinned by `retention-charts.test.tsx`.
- No live database or seeded session in this environment: verification is
  typecheck, lint, Vitest, build and (where possible) a static render — not a
  real browser pass.

## Approaches considered

**A. Recompose inside the shared system (recommended).** Keep `PageHero`,
`PageContainer`, the palette and the state tokens. Make the pages premium by
composition: full hero on list pages, pastel KPI cells, an iOS-style segmented
filter, grouped inset rows, gradient avatars, soft status pills, one accent
per section. No new colour families, no new theme files, no guardrail
exemptions.

**B. Per-page decorative theme files** (the dashboard/profile/attendance
pattern). Maximum visual freedom, but it fragments the design system, needs a
new exemption in `palette.test.ts` and `token-files.ts`, and contradicts the
recorded direction that the shared system is the reference. Rejected.

**C. A component kit / new dependency.** Adds weight and a second design
language for no capability we lack. Rejected.

## Design

### 1. Active Clients KPI

- Tile links to `/pt-os/clients?status=active`.
- The clients page seeds its status pill from `?status=` once on mount,
  validated against the five known values (`all`, `active`, `pending`,
  `frozen`, `expired`). Reuses the existing seed-once hook pattern used for
  `?q=`.
- With `status=active` the hero title reads **Active Clients**, and a
  dismissible "Showing active only" chip returns to All.
- The server filter already does the query; no API change.

### 2. All Clients — premium Apple treatment

- **Hero:** full `PageHero`, `accent="brand"`, subtitle
  `"{active} active · {expiring} expiring soon"`, `HeroChip`s for outstanding
  balance and total clients. `New Client` stays in `PageActions`.
- **Summary:** keep `ClientKpiStrip` as one object (its own file explains why
  four cards was wrong), but give each cell a soft family tint
  (`info` / `success` / `warning` / `danger` soft tokens), a coloured dot in a
  tinted chip, and a bigger tabular figure. 2×2 on mobile, four across from
  `sm`; height stays close to today's 139px.
- **Toolbar:** iOS search field (filled, rounded-full, leading magnifier,
  clear button) + a segmented control on a `--bg-subtle` track with a raised
  card thumb and a coloured status dot per segment. Horizontally scrollable on
  a phone, wrapping from `sm`.
- **Roster:** keep the `<table>` semantics (columns are real), restyle the
  rows as an inset grouped list: one 22px container, 72–76px rows, hairline
  dividers inset from the leading avatar, hover tint, pointer cursor. Avatar
  gradient chosen by a stable hash of the client id, not row index. Status as
  a soft pill, balance as the only red/green figure, days arc unchanged.
- **States:** error, empty and pagination move onto the shared `EmptyState`
  and pill buttons.
- **Mobile:** the table keeps three columns (client, status, days/balance) and
  hides trainer/package/commission exactly as today. No horizontal scroll.

### 3. Leads — premium Apple treatment

- **Hero:** full `PageHero`, `accent="amber"`, subtitle `"{total} leads ·
  {inProgress} in progress"`, chips for new and converted. `Add Lead` and the
  follow-up action stay in `PageActions`.
- **Summary:** keep the four KPI tiles, align them with the clients summary
  (same radius, hairline, tinted icon tile, 28px tabular number, 10.5px
  caption). 2×2 on mobile, four across from `sm`.
- **Hierarchy:** search + segmented status filter first, then the lead list,
  then the funnel chart and its data table inside one titled card (collapsed
  by default on mobile). The chart keeps its exact data shape.
- **Lead rows:** contact-card treatment — gradient avatar, name, phone/email
  line with icons, status pill, chips for source/package/trainer/follow-up,
  notes clamped to two lines, Convert as a prominent emerald pill, edit/delete
  as quiet icon buttons. Same handlers, same confirmations.
- **States:** shared `EmptyState`, error banner, loading skeleton.

### 4. Messages — a real chat screen

Shared work in `ChatThread` / `ChatComposer`:

- Optional `accent` colour (default brand) for own bubbles, read ticks and the
  send button.
- Optional `peer` ({name, photoUrl}) renders the other side's avatar beside the
  first message of an incoming group.
- Bubbles: own = accent gradient, white text, small tail radius; theirs =
  `--bg-card` with a hairline, ink text. Day chips unchanged.
- Composer: floating pill field with a blurred bar, round send button, same
  Enter/Shift+Enter behaviour and 2000-char cap.

Trainer `/pt-os/messages`:

- Drop the page hero. A slim toolbar ("Messages", unread count, New message)
  sits above a full-height two-pane card: inset inbox rows, gradient avatars,
  unread pill, preview, time; active row tinted. Thread header shows avatar,
  name, member code and the profile link.
- The empty-thread pane keeps its "Pick a conversation" prompt.

Member `/member/messages`:

- Drop the gradient hero. A compact chat header (avatar, trainer name, studio,
  private-message note) pinned at the top; thread fills the rest between the
  header and the composer above the tab bar.
- Background gets a very soft tinted wash so bubbles read as surfaces.
- Empty state keeps the "Message {name}" prompt.

### 5. The Add Lead standard, app-wide

This pass makes the standard explicit and applies it to the four surfaces
above. It does **not** rewrite every form in one change: each form carries its
own journey/ratchet coverage. Follow-up batches, in order: new client, edit
client, enroll, package create/edit, record payment, settings/profile.

The standard, for reference:

- `PageContainer` + full hero for landing/list pages, compact hero for dense
  utilities, no bespoke hero.
- One card per step/group; `FormSection` hairline groups; `FloatInput` fields;
  no restating helper text.
- One pinned action bar; primary action on the right.
- Soft tints for state, brand rose for action, no colour without meaning.

## Files expected to change

- `src/app/(chrome)/pt-os/clients/page.tsx`
- `src/components/pt-os/ClientKpiStrip.tsx`
- `src/app/(chrome)/pt-os/leads/page.tsx`
- `src/app/(chrome)/pt-os/messages/page.tsx`
- `src/app/(bare)/member/messages/page.tsx`
- `src/components/chat/ChatThread.tsx`
- `src/components/chat/ChatComposer.tsx`
- `src/components/dashboards/PtOsDashboard.tsx` (one href)
- `src/lib/use-seeded-search.ts` (seed a second param)
- One small hook/validator test.

## Verification

- `npx tsc --noEmit`
- Targeted Vitest: `palette`, `scale`, `design-system-guardrails`,
  `shadow-tokens`, `page-shell`, `client-kpi-strip`, `retention-charts`,
  `silent-catch-ratchet`, `form-platform-ratchet`, plus the new hook test.
- Full `npx vitest run`.
- `npx eslint` on every changed file.
- `NEXT_PUBLIC_API_URL=https://api.myptstudio.com npm run build`.
- `node scripts/api-contract-check.mjs` (no endpoint change expected).
- Not run: live browser at 390px / dark mode — no seeded stack. This will be
  reported as a limitation, not claimed as verified.

## Risks

- Removing the hero from the two message pages is a deliberate exception to
  "every page has a hero", justified by a full-height chat surface (same class
  as the AI Coach and QR scanner full-screen flows). Reversible in one block.
- The clients table restyle must keep row click, column semantics and the
  existing status math; the table stays.
- No new colour values or type/radius steps, so the redesign is denser than a
  greenfield Apple mock; the palette's `identity` ramp is explicitly the
  "Apple tint" set and is used for avatars.
- The dirty `feat/goal-secondary-goals` tree already contains user edits to
  these files. Work continues in place, uncommitted, without touching unrelated
  files or the user's other changes.
