# MY PT STUDIO --- Unified UI/UX Design System

## OpenCode Implementation Specification

**Document type:** Product-wide UI/UX implementation brief\
**Product:** MY PT STUDIO\
**Design direction:** Premium Light Glassmorphic Bento UI\
**Primary visual identity:** Soft glass surfaces + clean solid cards +
burgundy/rose gradients + subtle depth\
**Priority:** Consistency, usability, readability, responsive behavior,
and preservation of existing functionality

------------------------------------------------------------------------

## 1. Mission

Apply one coherent, production-quality design system across the **entire
MY PT STUDIO web application**.

Use the supplied mobile screenshots as the visual reference for the
overall design language. The screenshots show a consistent family of
patterns:

-   Light-first, soft pastel page backgrounds.
-   Selective glassmorphism for prominent hero areas and floating
    surfaces.
-   Mostly solid white cards for information-heavy content.
-   Soft shadows, subtle borders, and generously rounded corners.
-   Burgundy/rose as the primary brand accent, supported by restrained
    green, orange, red, teal, and purple status colors.
-   Modular Bento-style dashboard and KPI layouts.
-   Rounded, colorful icon containers.
-   A persistent dark navy bottom navigation on mobile.
-   Clear typography, strong headings, and compact supporting text.

This is **not** a request to put blur, gradients, or shadows on every
element. The result must feel premium and deliberate, not noisy,
childish, over-decorated, or like a generic template.

### Required design identity

> **Premium Light Glassmorphic Bento UI --- with Soft UI surfaces and
> Burgundy Gradient accents.**

Treat this as the shared design language for every module, page, modal,
drawer, form, table, chart, empty state, and navigation surface.

------------------------------------------------------------------------

## 2. Non-negotiable implementation rules

1.  **Inspect before changing.** Audit the existing frontend
    architecture, routes, layouts, design tokens, reusable components,
    and current responsive behavior before implementation.
2.  **Preserve functionality.** Do not remove, weaken, mock, or silently
    change business logic, API contracts, permissions, validation,
    calculations, or workflows to achieve a visual result.
3.  **Do not rebuild the app from scratch.** Refactor and extend the
    existing component system where practical.
4.  **Use shared components and tokens.** Do not create a different
    visual implementation for every page.
5.  **Light mode is the default.** Do not make dark UI the default. If a
    dark theme already exists, preserve it as an optional theme and
    ensure the light theme remains the primary experience.
6.  **Mobile-first, fully responsive.** The supplied screenshots are
    mobile references, but desktop and tablet layouts must also be
    intentionally designed.
7.  **Avoid excessive glass.** Use glass selectively. Use solid white
    surfaces for dense forms, data tables, settings, and
    information-heavy cards.
8.  **Avoid excessive gradients.** Reserve strong gradients for hero
    banners, primary highlights, and selected brand moments.
9.  **Do not add decorative helper text everywhere.** Remove redundant
    helper/caption text where it adds no meaningful value. Keep
    essential instructions, validation, units, accessibility labels, and
    legally or operationally important explanations.
10. **Do not introduce horizontal page overflow.** Horizontal scrolling
    is allowed only for intentionally designed compact tab strips or
    chip lists, with clear visual affordance.
11. **Do not change navigation semantics.** Existing routes, active
    states, deep links, and permission rules must continue to work.
12. **Do not use arbitrary one-off CSS values** when a shared token or
    component variant can be used.
13. **Do not apply visual changes blindly.** Check each page's
    information hierarchy and choose the correct surface pattern for its
    content.
14. **Do not claim completion without verification.** Run the relevant
    type checks, lint, tests, and production build. Inspect the changed
    screens at mobile, tablet, and desktop widths.

------------------------------------------------------------------------

## 3. Visual language

### 3.1 Page background

Use a very light neutral base with extremely subtle ambient color
variation.

-   Main background: near-white cool neutral.
-   Optional ambient tint: very subtle blush, lavender, or pale blue.
-   Avoid strong colored page backgrounds behind every section.
-   Maintain sufficient contrast between the page background and card
    surfaces.

Suggested token starting points (adapt to the existing brand palette
after auditing):

  ----------------------------------------------------------------------------
  Token                     Suggested value            Purpose
  ------------------------- -------------------------- -----------------------
  `--color-page`            `#F7F8FC`                  Main light page
                                                       background

  `--color-surface`         `#FFFFFF`                  Standard cards and
                                                       panels

  `--color-surface-soft`    `#F0F2F9`                  Inputs, selected soft
                                                       surfaces

  `--color-surface-glass`   `rgba(255,255,255,0.72)`   Selective glass
                                                       surfaces

  `--color-brand`           `#9F3158`                  Primary burgundy

  `--color-brand-deep`      `#762544`                  Deep burgundy

  `--color-brand-rose`      `#D86B78`                  Rose accent

  `--color-text`            `#151A2B`                  Main text

  `--color-text-muted`      `#687287`                  Secondary text

  `--color-border`          `#E4E7EF`                  Soft borders

  `--color-success`         `#19A978`                  Success

  `--color-warning`         `#E99A16`                  Warning

  `--color-danger`          `#DE454B`                  Error / destructive

  `--color-info`            `#3989D9`                  Informational

  `--color-navy`            `#1C243B`                  Mobile navigation
  ----------------------------------------------------------------------------

These are **initial design tokens, not permission to replace an
established accessible brand palette without checking it**. Inspect the
current theme and consolidate duplicate colors before introducing new
values.

### 3.2 Brand gradient

Use a controlled burgundy-to-rose gradient for prominent hero banners
and selected primary brand surfaces.

Suggested direction:

-   Deep burgundy at one edge.
-   Rose / muted coral toward the other edge.
-   Optional very subtle tonal grid or texture only when it does not
    reduce text legibility.
-   White text and simple white line icons.
-   Soft, broad shadow beneath the hero.

Do not use the hero gradient on every card, button, table, or section.

### 3.3 Glassmorphism

Use glassmorphism selectively for:

-   Main page hero banners.
-   Floating navigation or floating utility surfaces, where appropriate.
-   Small overlays that genuinely benefit from layered depth.
-   Selected featured panels.

Glass treatment should use:

-   Semi-transparent light surface.
-   Restrained backdrop blur.
-   Fine low-contrast border.
-   Soft shadow.
-   Adequate text contrast.

Do not use glass for every card. Avoid blur behind dense text, forms,
tables, or critical financial values. Provide a readable solid fallback
where backdrop filters are unsupported.

### 3.4 Soft UI / Neumorphic influence

Use soft depth rather than exaggerated neumorphism:

-   Subtle ambient shadows.
-   Thin neutral borders.
-   Small elevation differences between page, card, and overlay.
-   No hard black shadows.
-   No deeply inset controls that look disabled.
-   Do not rely on shadow alone to communicate clickable state.

### 3.5 Cards and Bento layout

Standard card appearance:

-   White or near-white solid surface.
-   Thin soft border.
-   Medium-to-large rounded corners.
-   Gentle shadow only where needed.
-   Consistent internal spacing.
-   Clear heading, content, and action hierarchy.

Use Bento layout for dashboards and KPI groupings where it improves
scanning. Do not force every page into a grid. Long forms, detailed
client records, and workflows may use a single-column sequence.

### 3.6 Radius scale

Create shared radius tokens and use them consistently:

-   Small: inputs, chips, compact controls.
-   Medium: buttons, small cards.
-   Large: standard cards and panels.
-   Extra large: hero banners and prominent feature containers.

Avoid mixing many unrelated corner radii on one screen.

### 3.7 Shadows and elevation

Create a small elevation scale:

-   Level 0: flat surfaces.
-   Level 1: standard cards.
-   Level 2: floating panels, menus, popovers.
-   Level 3: dialogs and important overlays.

Shadows should be diffuse and subtle. Do not add a visible shadow to
every nested element.

------------------------------------------------------------------------

## 4. Typography

Use the existing application font if it is already suitable. Otherwise
choose one highly legible modern sans-serif family and use it
consistently.

Typography hierarchy:

-   Page title: strong, clear, prominent.
-   Section title: bold, smaller than page title.
-   Card title: medium-to-bold.
-   KPI value: large and high contrast.
-   Body: comfortable reading size.
-   Metadata: smaller and muted, but still readable.
-   Labels: concise, medium weight, consistent casing.

Rules:

-   Avoid excessive uppercase text.
-   Use uppercase only for compact KPI labels or small section eyebrows
    where it improves scanning.
-   Do not truncate important names, payment values, dates, or status
    text.
-   Use line clamping only for secondary descriptions, with a way to
    view the full content.
-   Maintain readable line-height and adequate contrast.
-   Avoid tiny helper text.

------------------------------------------------------------------------

## 5. Color semantics

Use color consistently by meaning, not decoration.

  -----------------------------------------------------------------------
  Meaning                 Color family            Usage
  ----------------------- ----------------------- -----------------------
  Primary action / brand  Burgundy / rose         Main CTA, selected
                                                  tabs, brand highlights

  Success / completed /   Green                   Paid, completed,
  active                                          healthy, connected

  Warning / due /         Amber / orange          Due soon, attention
  upcoming                                        required

  Error / rejected /      Red                     Failed, rejected,
  destructive                                     destructive actions

  Information             Blue                    Informational states
                                                  and neutral highlights

  AI / smart assistance   Purple or brand accent  AI Coach and AI-related
                                                  surfaces

  Neutral                 Slate / grey            Metadata, secondary
                                                  controls, inactive
                                                  states
  -----------------------------------------------------------------------

Do not communicate status using color alone. Always include a label,
icon, or other textual cue.

Do not color every icon differently without a semantic reason. Use a
small, repeatable icon color system.

------------------------------------------------------------------------

## 6. Buttons and interactive controls

### Primary button

-   Burgundy or burgundy-to-rose fill.
-   White text and accessible icon.
-   Clear hover, pressed, focus, loading, and disabled states.
-   Use for the most important action on a screen.

### Secondary button

-   White or soft neutral surface.
-   Subtle border.
-   Dark text or brand-colored text.
-   Use for less prominent actions.

### Tertiary / text action

-   No heavy container.
-   Clear text and optional icon.
-   Use for low-emphasis navigation actions.

### Destructive button

-   Red semantic styling.
-   Use only for destructive actions.
-   Require confirmation for irreversible or high-impact operations
    where the existing workflow expects it.

### Icon buttons

-   Consistent hit area.
-   Tooltip or accessible name.
-   Visible focus state.
-   Do not use an icon without an accessible label for important
    actions.

### Inputs and selects

-   Light neutral fill or white surface.
-   Soft border.
-   Consistent height, radius, padding, and label placement.
-   Clear focus ring in brand color.
-   Error state with text, not only a red border.
-   Disabled and read-only states must be visually distinct.
-   Preserve existing validation and field behavior.

### Chips, tabs, and segmented controls

-   Selected state: burgundy/rose or soft burgundy tint.
-   Unselected state: neutral light surface.
-   Compact but easy to tap.
-   Horizontal overflow only for intentionally scrollable tab strips.

------------------------------------------------------------------------

## 7. Navigation system

### 7.1 Mobile bottom navigation

Use the supplied screenshots as the reference:

-   Fixed bottom navigation.
-   Dark navy background.
-   Five primary destinations where those match the existing app
    structure.
-   Icon above or beside a short label, consistent across all
    destinations.
-   Active destination shown with a rounded, subtle highlighted pill.
-   Active icon/label use a warm light accent.
-   Inactive items use muted slate.
-   Respect iOS safe-area inset and Android system navigation area.
-   Add enough bottom content padding so the navigation never covers
    page content, buttons, or form controls.
-   Ensure each destination has a sufficiently large touch target.
-   Preserve existing route and permission logic.

Do not hard-code the same five destinations if the actual role or
permission model requires a different set. Use the existing navigation
configuration.

### 7.2 Desktop and tablet navigation

-   Preserve the existing information architecture.
-   Use a clean sidebar, top navigation, or existing responsive
    navigation pattern according to the current app structure.
-   Do not force the mobile bottom bar onto desktop.
-   Keep active route state clear.
-   Avoid duplicate navigation controls that waste space.

### 7.3 Top header

The reference header uses a light, translucent surface with compact
utility controls.

-   Keep the header visually quiet.
-   Use a soft border or subtle shadow to separate it from content.
-   Align menu, search, theme, settings, notifications, and profile
    controls consistently where those controls exist.
-   Ensure dropdowns and popovers remain inside the viewport.
-   Support keyboard navigation and accessible names.

------------------------------------------------------------------------

## 8. Page and module patterns

Apply the shared system to every existing route. The following patterns
explain how to choose the correct layout; they are not permission to
invent new product features.

### 8.1 Dashboard / Home

-   Use one prominent burgundy/rose hero banner where it supports the
    page identity.
-   Place today's sessions and urgent next actions near the top.
-   Use compact Bento cards for KPIs and operational summaries.
-   Use clear visual priority: urgent actions first, then daily work,
    then insights and analytics.
-   Quick actions should be compact, consistent, and easy to tap.
-   Avoid excessive card nesting and repeated section headings.
-   Charts must remain legible and responsive.

### 8.2 Client list

-   Use a clean search and filter area.
-   Use compact, readable client rows or cards.
-   Show identity, relevant status, and the most useful secondary
    information.
-   Keep actions discoverable without overcrowding each row.
-   On desktop, use a data table when it is more efficient; on mobile,
    use responsive cards or a carefully designed condensed list.
-   Preserve search, filtering, sorting, pagination, and permission
    behavior.

### 8.3 Client profile / Client 360

-   Use a branded profile hero with avatar, name, status, and client
    identifier.
-   Place high-priority contact actions in a compact action row.
-   Membership, paid amount, balance, and expiry should be easy to scan.
-   Use solid cards for detailed account, login, consent, screening, and
    health-related records.
-   Use a clear tab strip for Overview, Training, Workout Log,
    Measurements, Nutrition, and other existing sections.
-   Keep the tab strip sticky only if it does not consume excessive
    mobile viewport space.
-   Organize long details into meaningful sections.
-   Do not hide important account or safety information behind
    decorative effects.

### 8.4 Sessions / Schedule

-   Use a branded page hero with a clear primary booking action.
-   Use a compact weekly date selector.
-   Use small KPI cards for scheduled, to-do, completed, and missed
    sessions.
-   Session cards should show client identity, time, workout/program
    summary, and the relevant action.
-   Make the primary action obvious.
-   Avoid overly tall date selectors or unnecessary explanatory copy.

### 8.5 WhatsApp

-   Use a clear page heading and compact status panels.
-   Differentiate manual chat availability from automated reminder
    connection status.
-   Use semantic success/warning/error surfaces.
-   Keep member search, selection, bulk actions, message template, and
    connection management visually grouped.
-   Never imply a message was delivered merely because WhatsApp opened.
    Preserve accurate delivery-state language and existing integration
    behavior.

### 8.6 Revenue / Business analytics

-   Use a clear target-setting panel at the top when applicable.
-   Keep date range and year filters compact.
-   Use a Bento grid for major financial KPIs.
-   Use consistent number formatting, currency formatting, and
    comparison labels.
-   Use solid surfaces for financial values; do not put critical money
    figures on visually noisy gradients.
-   Charts must have clear labels, units, legends, and empty states.
-   Preserve the existing calculation definitions and data sources.

### 8.7 Payment verification

-   Use a brand hero only for the page title and primary request action.
-   Group summary KPIs in a compact grid.
-   Search and status filters should be easy to reach.
-   Use clear pending, approved, rejected, and empty states.
-   Make payment status and amounts highly readable.
-   Do not make financial status dependent on color alone.

### 8.8 Profile / Settings

-   Use clean solid cards and a clear section hierarchy.
-   Forms should be single-column on mobile and use sensible
    multi-column layouts on larger screens.
-   Keep labels visible above fields.
-   Group related settings.
-   Remove redundant decorative hero buttons or unnecessary helper copy,
    but preserve essential instructions and validation.
-   Save, cancel, and destructive actions must be clearly
    differentiated.

### 8.9 AI Coach

-   Use a distinctive but restrained AI accent (purple or brand rose).
-   Clearly separate prompts, generated results, evidence/source
    details, and actions.
-   Loading, empty, error, and success states must be consistent.
-   Do not imply AI output is verified or authoritative when it is not.
-   Preserve existing AI permissions, quotas, model routing, and
    source-grounding behavior.

### 8.10 Other modules

Apply the same design tokens and component patterns to every other
module and route, including but not limited to:

-   Check-in and QR.
-   Workout programming and workout logs.
-   Measurements and progress.
-   Nutrition and diet plans.
-   PAR-Q and consent.
-   Client interviews and lifestyle evaluation.
-   Goals and assessments.
-   Membership plans and enrolments.
-   Payments, invoices, and collections.
-   Trainer management and commissions.
-   Inventory.
-   Reports and exports.
-   Notifications.
-   Integrations, WhatsApp automation, webhooks, and API settings.
-   Admin, tenant, and system settings.

For modules not explicitly listed, inspect the actual screen and select
the appropriate shared pattern. Do not invent content or alter
workflows.

------------------------------------------------------------------------

## 9. Forms and data-heavy interfaces

Forms are functional workspaces, not decorative cards.

-   Use visible labels.
-   Keep related fields grouped.
-   Use dropdowns, searchable selects, segmented controls, and
    multi-selects when the data model and workflow support them.
-   Do not replace free-text fields with dropdowns if users need
    genuinely open-ended information.
-   Use concise field descriptions only when needed.
-   Keep validation messages close to the relevant field.
-   Clearly distinguish required and optional fields.
-   Use sensible keyboard types on mobile.
-   Preserve all existing form values, defaults, validation, and
    submission behavior.
-   Long forms should use clear section headers and a predictable
    save/cancel pattern.

For tables and dense data: - Prioritize scanability over decoration. -
Keep column headings clear. - Use subtle row separators. - Avoid
wrapping key identifiers and monetary values unnecessarily. - Provide a
responsive mobile presentation without losing essential information. -
Keep sorting, filtering, pagination, export, and row actions intact.

------------------------------------------------------------------------

## 10. Responsive behavior

Use the project's existing breakpoint system where possible. Do not
introduce conflicting breakpoint definitions.

### Mobile

-   Single-column content by default.
-   Two-column KPI grid only when cards remain readable.
-   Full-width primary actions when appropriate.
-   Comfortable touch targets.
-   Fixed bottom navigation with safe-area handling.
-   No clipped cards or accidental horizontal page scroll.
-   Long labels and client names must wrap gracefully.
-   Sticky headers and tab strips must not consume too much vertical
    space.

### Tablet

-   Use two-column layouts where content supports them.
-   Keep forms and tables readable.
-   Avoid stretching narrow cards across excessive empty space.

### Desktop

-   Use the available width intentionally.
-   Use multi-column Bento layouts for dashboard summaries.
-   Use tables for dense operational data when appropriate.
-   Keep line lengths readable.
-   Maintain consistent max-width and page gutters.
-   Do not simply scale up the mobile layout.

Test at minimum: - 360 px wide mobile. - 390 px wide mobile. - 430 px
wide mobile. - 768 px tablet. - 1024 px small desktop. - 1440 px
desktop.

------------------------------------------------------------------------

## 11. Motion and interaction feedback

Use restrained motion:

-   Short transitions for hover, focus, selected, and pressed states.
-   Small elevation or color changes on interactive cards.
-   Subtle modal and drawer transitions.
-   Skeleton loading states where existing loading behavior supports
    them.
-   Avoid decorative animations that distract from operational tasks.
-   Respect `prefers-reduced-motion`.
-   Do not animate large layout shifts or delay important actions.

Every interactive element must have: - Default state. - Hover state
where relevant. - Focus-visible state. - Pressed/active state. -
Disabled state where relevant. - Loading state where relevant.

------------------------------------------------------------------------

## 12. Accessibility and usability requirements

-   Maintain WCAG AA contrast for normal text wherever practical.
-   Never use color as the only status indicator.
-   Provide accessible names for icon-only buttons.
-   Preserve semantic headings and landmarks.
-   Ensure keyboard navigation works.
-   Ensure focus indicators are visible.
-   Associate form labels and validation messages with their controls.
-   Use appropriate button, link, input, and navigation semantics.
-   Ensure dialogs trap focus appropriately and return focus when
    closed.
-   Respect reduced-motion preferences.
-   Do not reduce font size merely to fit more content.
-   Touch targets should be comfortably usable on phones.

------------------------------------------------------------------------

## 13. Component architecture and design tokens

Before implementing new UI, inspect the existing component library and
consolidate it.

Create or standardize reusable components where appropriate, such as:

-   `PageHeader`
-   `PageHero`
-   `SectionHeader`
-   `SurfaceCard`
-   `GlassSurface`
-   `BentoGrid`
-   `KpiCard`
-   `StatusBadge`
-   `IconTile`
-   `PrimaryButton`
-   `SecondaryButton`
-   `IconButton`
-   `SearchField`
-   `FilterBar`
-   `TabBar`
-   `EmptyState`
-   `LoadingState`
-   `ErrorState`
-   `ConfirmDialog`
-   `ResponsiveDataTable`
-   `MobileBottomNavigation`

Names are illustrative. Follow existing naming conventions and avoid
creating duplicates of components that already exist.

Centralize tokens for:

-   Brand and semantic colors.
-   Typography.
-   Spacing.
-   Radius.
-   Borders.
-   Shadows/elevation.
-   Z-index layers.
-   Breakpoints.
-   Component heights.
-   Focus rings.
-   Motion durations.

Use CSS variables, the existing theme system, or the project's
established token mechanism. Do not create a second competing theme
system.

### Component variants

Prefer explicit, limited variants rather than page-specific styles:

-   Card: `default`, `soft`, `glass`, `outlined`, `interactive`.
-   Hero: `brand`, `compact`.
-   Button: `primary`, `secondary`, `tertiary`, `danger`.
-   Badge: `success`, `warning`, `danger`, `info`, `neutral`, `brand`.
-   Icon tile: semantic color variants.

Do not expose a large number of arbitrary style props if a small set of
variants can solve the need.

------------------------------------------------------------------------

## 14. Performance and implementation quality

-   Avoid adding heavy UI dependencies just to reproduce simple visual
    effects.
-   Prefer CSS for gradients, borders, and subtle shadows.
-   Use backdrop filters sparingly and provide fallbacks.
-   Avoid unnecessary client components and re-renders.
-   Preserve image optimization and lazy loading.
-   Avoid layout shift when avatars, charts, or data load.
-   Do not add large background images or decorative assets without a
    clear need.
-   Keep charts responsive and avoid rendering oversized SVGs or
    canvases unnecessarily.
-   Keep the existing stack and architecture unless a change is
    demonstrably necessary.

------------------------------------------------------------------------

## 15. OpenCode execution plan

OpenCode must work in controlled phases. Do not attempt a blind
all-at-once rewrite.

### Phase 0 --- Repository and application audit

1.  Identify the frontend repository and the actual application entry
    points.
2.  Inspect package scripts, framework version, routing, layouts, global
    CSS, theme setup, and component libraries.
3.  Inventory all routes and major page components.
4.  Identify duplicated styles, inconsistent tokens, one-off cards, and
    existing reusable components.
5.  Inspect current mobile navigation and desktop navigation behavior.
6.  Identify visual regressions or existing accessibility/responsive
    problems.
7.  Produce a short audit report with:
    -   Route inventory.
    -   Existing design system inventory.
    -   Reusable components to retain.
    -   Components to consolidate.
    -   Risks and dependencies.
    -   Recommended implementation order.

**Do not begin broad visual edits until the audit is complete.**

### Phase 1 --- Foundation

1.  Consolidate color, typography, spacing, radius, shadow, and
    elevation tokens.
2.  Define light-first page and surface primitives.
3.  Define the brand gradient and selective glass surface.
4.  Standardize button, input, badge, icon tile, and card variants.
5.  Standardize focus, hover, pressed, disabled, and loading states.
6.  Confirm dark theme compatibility if one already exists.
7.  Verify the foundation on a small representative set of screens
    before expanding.

### Phase 2 --- Global application shell

1.  Update the page background and content container system.
2.  Standardize top header.
3.  Standardize mobile bottom navigation and safe-area spacing.
4.  Standardize desktop/tablet navigation without changing route
    behavior.
5.  Verify z-index, menus, dialogs, popovers, and sticky elements.
6.  Confirm no content is hidden behind fixed navigation.

### Phase 3 --- Shared components

Refactor repeated patterns into reusable components. Migrate existing
pages to the shared components rather than maintaining duplicate
implementations.

### Phase 4 --- Module migration

Migrate pages in this order, adjusting based on route dependencies:

1.  Dashboard.
2.  Client list and Client 360.
3.  Sessions and schedule.
4.  WhatsApp.
5.  Revenue and analytics.
6.  Payment verification.
7.  AI Coach.
8.  Profile and settings.
9.  Remaining operational modules.

For each module: - Inspect current behavior. - Record the existing
actions and states. - Implement the new presentation. - Verify desktop
and mobile. - Test interactions and permissions. - Check empty, loading,
error, and populated states. - Confirm that no business behavior
changed.

### Phase 5 --- Responsive and accessibility pass

Test all representative pages at the specified viewport widths. Fix: -
Horizontal overflow. - Clipped controls. - Overlapping sticky/fixed
elements. - Inaccessible contrast. - Small touch targets. - Unreadable
tables. - Long text overflow. - Dialog and popover positioning. -
Safe-area and bottom navigation overlap.

### Phase 6 --- Verification and cleanup

1.  Run formatting, lint, and type checking using the repository's
    actual scripts.
2.  Run relevant unit and integration tests.
3.  Run relevant end-to-end tests for critical flows.
4.  Run a production build.
5.  Review changed routes and shared components for regressions.
6.  Remove obsolete CSS only after confirming it is unused.
7.  Report changed files, completed routes, tests run, and known
    remaining issues.

Do not weaken, delete, skip, or rewrite tests simply to make the
implementation pass.

------------------------------------------------------------------------

## 16. Visual quality acceptance checklist

The implementation is not complete until all applicable items pass.

### Brand consistency

-   [ ] Every module uses the same core color tokens.
-   [ ] Burgundy/rose is the consistent primary brand accent.
-   [ ] Success, warning, danger, and info colors have consistent
    meanings.
-   [ ] Typography hierarchy is consistent.
-   [ ] Radius, spacing, borders, and shadows are consistent.

### Surface treatment

-   [ ] Glass is used selectively, not on every card.
-   [ ] Dense data and forms use readable solid surfaces.
-   [ ] Hero gradients are restrained and consistent.
-   [ ] Shadows are subtle and do not create visual clutter.
-   [ ] Nested cards are minimized.

### Navigation

-   [ ] Mobile bottom navigation remains fixed and usable.
-   [ ] Safe-area insets are respected.
-   [ ] Active route is clear.
-   [ ] Page content is not obscured by navigation.
-   [ ] Desktop navigation remains appropriate for larger screens.

### Functionality

-   [ ] All existing actions still work.
-   [ ] Existing API behavior is unchanged.
-   [ ] Permissions and role-based visibility are unchanged.
-   [ ] Search, filter, sort, pagination, and forms still work.
-   [ ] Loading, empty, error, and success states are present where
    needed.
-   [ ] No fake success or misleading delivery/payment states are
    introduced.

### Responsive quality

-   [ ] No accidental horizontal page scrolling.
-   [ ] No clipped or overlapping content.
-   [ ] Cards adapt to available width.
-   [ ] Tables have a usable mobile treatment.
-   [ ] Dialogs, menus, and popovers fit the viewport.
-   [ ] Fixed navigation does not cover content.

### Engineering quality

-   [ ] Shared components are reused.
-   [ ] No unnecessary duplicate design systems are introduced.
-   [ ] No unused or conflicting CSS remains from the migration.
-   [ ] Type checks pass.
-   [ ] Lint passes.
-   [ ] Relevant tests pass.
-   [ ] Production build passes.

------------------------------------------------------------------------

## 17. Explicit anti-patterns --- do not do these

-   Do not turn every card into frosted glass.
-   Do not use strong gradients on every surface.
-   Do not use large, blurry shadows everywhere.
-   Do not use excessive glow effects.
-   Do not use a different accent color on every page.
-   Do not use random corner radii.
-   Do not make every section a separate card.
-   Do not nest cards inside cards without a clear information
    hierarchy.
-   Do not make KPI cards so tall that they waste mobile screen space.
-   Do not shrink text to fit long content; wrap or redesign the layout.
-   Do not hide critical information behind tabs or hover-only
    interactions on mobile.
-   Do not use color alone for status.
-   Do not sacrifice contrast for a glass effect.
-   Do not make all buttons the same visual priority.
-   Do not change data, business logic, permissions, or workflows as
    part of a visual redesign.
-   Do not replace existing working components with new dependencies
    without a clear technical reason.
-   Do not declare all routes redesigned after changing only the shared
    header or dashboard.

------------------------------------------------------------------------

## 18. Required final report from OpenCode

At the end of the work, provide:

1.  **Audit summary:** architecture, route count, existing design
    patterns.
2.  **Design foundation:** tokens and shared components created or
    updated.
3.  **Route coverage:** every route changed, partially changed, or not
    changed.
4.  **Responsive verification:** viewport sizes checked and issues
    fixed.
5.  **Accessibility verification:** contrast, keyboard, labels, and
    focus checks.
6.  **Functional verification:** important flows tested.
7.  **Engineering verification:** exact lint, typecheck, test, and build
    commands with results.
8.  **Remaining issues:** honest list of anything incomplete or blocked.
9.  **Screenshots:** before/after screenshots for representative mobile,
    tablet, and desktop pages, if the available environment supports
    them.

Never report a route as complete unless it has actually been inspected
and verified.

------------------------------------------------------------------------

# 19. Copy-paste instruction for OpenCode

Use this instruction after placing this file in the frontend repository
(for example, at `docs/design/UNIFIED_UI_UX_DESIGN_SYSTEM.md`):

> Read `docs/design/UNIFIED_UI_UX_DESIGN_SYSTEM.md` completely and treat
> it as the authoritative visual and UX specification for the MY PT
> STUDIO frontend redesign.
>
> Start with Phase 0 only. Audit the actual repository, routes, shared
> layouts, components, styles, and responsive behavior. Do not make code
> changes during the audit. Return the route inventory, current
> design-system findings, reusable components, risks, and a phased
> implementation plan.
>
> After the audit, implement the specification in small, reviewable
> phases. Preserve all existing business logic, APIs, data, permissions,
> validations, and workflows. Reuse the current architecture and
> consolidate shared components instead of creating duplicate systems.
> Apply the design consistently across the entire application, not only
> the dashboard.
>
> Use the screenshots supplied in the conversation as visual references
> for the design language, not as pixel-perfect page templates. Follow
> the specification's selective glassmorphism, solid soft cards, Bento
> layouts, burgundy/rose accents, and light-first approach.
>
> After each phase, run the relevant checks and report exactly what
> changed and what remains. Do not claim completion without
> route-by-route and responsive verification. Do not weaken or remove
> tests to obtain a passing result.
>
> **First response required:** audit findings and implementation plan
> only. Wait for my approval before making broad code changes.

------------------------------------------------------------------------

**End of specification.**
