# UI Polish Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the design system enforceable — one brand blue, no slop utilities, and a ratcheted guardrail that blocks regression — before sweeping 237 files.

**Architecture:** Fix the two config-level root causes (Tailwind's `brand` scale and `--rgb-brand` are a different blue than the CSS token), add one source-scanning vitest guardrail that extends the existing `palette.test.ts` rather than duplicating it, then drive four bounded slop patterns to zero. The guardrail's baseline can only fall.

**Tech Stack:** Next.js 16.4.3, React 19, TypeScript, Tailwind, vitest (jsdom), framer-motion.

**Spec:** `docs/superpowers/specs/2026-10-27-ui-polish-design.md`

**Scope note:** This plan covers Phase 0, Phase 1, Phase 2, and the bounded slop fixes from Phase 5 (gradient text, spring easing, AI-hue gradients, side-tab stripes). The 237-file literal sweep (Phase 3), the hero rebuild (Phase 4), the image migration, and the touch-target inventory are a follow-on plan: their batch boundaries depend on this foundation landing.

## Global Constraints

- **No new dependencies.** The guardrail is a vitest test.
- **Next.js is 16.4.3.** Read `node_modules/next/dist/docs/` before touching framework APIs (`AGENTS.md` requires it).
- **`globals.css` and `palette.ts` stay in parity.** Any token change updates both.
- **`palette.test.ts` must keep passing.** It is the colour authority; the new guardrail extends it.
- **Do not flatten the ten sanctioned decorative themes.** Nine are listed in `src/__tests__/helpers/token-files.ts` after Task 3; the tenth, `founderGold`, lives in `src/lib/palette.ts`.
- **Legitimate dynamic styles stay inline.** A computed width, chart coordinate, or transform is not drift.
- **Merge commits, branches from `main`.** One PR per task group is acceptable; each task commits independently.
- **Touch targets are 44×44px minimum** where this plan touches interactive elements.

## Review Focus

1. **Reduced motion** — replacing spring easing must leave the transition itself intact, and the `prefers-reduced-motion` block must still apply. A transition that disappears is a regression.
2. **Dark mode on `PageHeader`** — deleting `.page-title`'s dark variant must not leave a light-only colour on a dark surface. Use `var(--text-primary)`, which is themed.
3. **Long titles in `PageHeader`** — the solid heading must still wrap/truncate like the gradient one did.
4. **Print and PDF surfaces** — `PageHeader` may be rendered into printed documents; a gradient that printed as transparent must not become invisible text.
5. **Cards that lose their only colour cue** — removing a side stripe from a card with no icon or badge leaves it visually flat; confirm each still reads as a distinct category.

---

### Task 1: Revert the dependency bumps

**Files:**
- Modify: `package.json`, `package-lock.json` (restore to `HEAD`)

**Interfaces:**
- Consumes: nothing.
- Produces: a tree where `npm run lint`, `npm run typecheck`, and the six previously failing tests pass.

- [ ] **Step 1: Confirm only the two files are dirty**

Run: `git status --short`
Expected: `M package.json`, `M package-lock.json`, plus untracked `docs/superpowers/specs/2026-10-27-ui-polish-design.md`. If any other tracked file is modified, stop and ask.

- [ ] **Step 2: Confirm the committed TypeScript version**

Run: `git show HEAD:package.json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).devDependencies.typescript))"`
Expected: `^5.9.3`

- [ ] **Step 3: Restore the committed versions**

```bash
git restore package.json package-lock.json
npm ci
```

- [ ] **Step 4: Verify lint and typecheck**

Run: `npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 5: Verify the six tests that the bumps broke**

Run:
```bash
npx vitest run \
  src/__tests__/bottom-nav-anchor.test.ts \
  src/__tests__/form-system-guardrails.test.tsx \
  src/__tests__/label-association.test.ts \
  src/__tests__/publicRoutes.seo.test.ts \
  src/__tests__/dashboard-kpis.test.tsx \
  src/__tests__/today-sessions-card.test.tsx
```
Expected: 6 files pass. If any still fails, stop — the failure is not the dependency bump and needs its own diagnosis.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: restore committed dependency versions"
```

---

### Task 2: Make the brand blue one value

**Files:**
- Modify: `src/app/globals.css:82`
- Modify: `tailwind.config.ts:44-62`
- Test: `src/__tests__/palette.test.ts`

**Interfaces:**
- Consumes: `palette.blue` from `src/lib/palette.ts` (keys `50`–`950`, including `450`).
- Produces: Tailwind's `brand-*` classes resolve to `palette.blue`; `--rgb-brand` is the RGB triplet of `palette.blue[500]`.

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/palette.test.ts`:

```ts
describe('the brand blue is one value', () => {
  it('matches --rgb-brand to palette.blue[500]', () => {
    const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
    const m = css.match(/--rgb-brand:\s*(\d+)\s+(\d+)\s+(\d+)/);
    expect(m).not.toBeNull();
    const hex = palette.blue[500];
    const expected = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(m!.slice(1).map(Number)).toEqual(expected);
  });

  it('sources the Tailwind brand scale from the palette', async () => {
    const config = (await import('../../../tailwind.config')).default;
    expect(config.theme?.extend?.colors?.brand).toEqual(palette.blue);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/palette.test.ts`
Expected: both new tests fail — `--rgb-brand` is `59 130 246`, and the Tailwind scale is a separate literal.

- [ ] **Step 3: Fix `--rgb-brand`**

In `src/app/globals.css`, change:

```css
--rgb-brand:    59 130 246;
```

to:

```css
--rgb-brand:    0 103 224;
```

- [ ] **Step 4: Source the Tailwind scale from the palette**

In `tailwind.config.ts`, add at the top:

```ts
import { blue } from './src/lib/palette';
```

Replace the entire `brand: { 50: …, 950: … }` block with:

```ts
brand: blue,
```

Delete the `surface: { DEFAULT: '#f8fafc', dark: '#0f172a' }` block — it has zero call sites.

- [ ] **Step 5: Remove the dead off-palette safelist entries**

Delete these from `safelist`: `bg-violet-300/30`, `bg-cyan-300/30`, and the glow entries containing `6,182,212` (cyan), `139,92,246` (violet), and `249,115,22` (orange).

Verify they are unused first:

Run: `grep -rn "300/30" src --include="*.tsx" --include="*.ts"`
Expected: no output. The entries are dead config.

Leave `KpiCard.tsx`'s own glow literals alone — they are a separate decorative decision and belong to the sweep plan.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/palette.test.ts`
Expected: PASS.

- [ ] **Step 7: Verify the build still resolves the config**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/__tests__/palette.test.ts
git commit -m "fix: make Tailwind and CSS brand scales resolve to one blue"
```

---

### Task 3: Add the design-system guardrail with a ratchet

**Files:**
- Create: `src/__tests__/helpers/token-files.ts`
- Create: `src/__tests__/fixtures/design-baseline.json`
- Create: `src/__tests__/design-system-guardrails.test.ts`
- Modify: `src/__tests__/palette.test.ts` (use the shared exemption helper)

**Interfaces:**
- Produces:
  - `DECORATIVE_THEME_PATHS: readonly string[]` — the nine path-based sanctioned theme exemptions, relative to `src/`. The tenth, `founderGold`, lives in `lib/palette.ts`, which both scans skip separately.
  - `isDecorativeTheme(relPath: string): boolean` — true when a path is inside or equal to one of them.
  - `PATTERNS: Record<Pattern, RegExp>` and `count(pattern: Pattern): { total: number; files: Array<[string, number]> }` in the guardrail test.
  - `design-baseline.json` with one number per pattern.

- [ ] **Step 1: Write the shared exemption helper**

Create `src/__tests__/helpers/token-files.ts`:

```ts
// The nine path-based decorative surfaces the palette scan sanctions, each
// confined to its own token file by palette.test.ts. The tenth exemption,
// founderGold, lives in lib/palette.ts, which both scans skip separately.
// Paths are relative to src/, with forward slashes. Both scans import this
// list so they cannot drift apart.

export const DECORATIVE_THEME_PATHS = [
  'components/landing/',
  'components/visualizations/',
  'components/member/memberTheme.ts',
  'components/pt-os/exercise-library/libraryTheme.ts',
  'components/dashboards/todayTheme.ts',
  'components/profile/profileTheme.ts',
  'components/attendance/attendanceTheme.ts',
  'components/platform/ccTheme.ts',
  'components/pt-os/fitness-testing/fitnessTheme.ts',
] as const;

export function isDecorativeTheme(relPath: string): boolean {
  const p = relPath.replaceAll('\\', '/');
  return DECORATIVE_THEME_PATHS.some((entry) =>
    entry.endsWith('/') ? p.startsWith(entry) : p.endsWith(entry),
  );
}
```

- [ ] **Step 2: Refactor `palette.test.ts` to use it**

Keep the `lib/palette.ts` skip (it holds `founderGold`, not a decorative theme). Replace the nine inline theme checks — the `p.endsWith(…)` / `p.includes(…)` lines for landing, visualizations, and the seven `*Theme.ts` files — with one check. Compute the path relative to `src` first:

```ts
import { relative } from 'node:path';
import { isDecorativeTheme } from './helpers/token-files';
// inside the walk, after the .tsx?/.css test:
const relToSrc = relative(join(process.cwd(), 'src'), p).replaceAll(sep, '/');
if (isDecorativeTheme(relToSrc)) continue;
```

Keep the `lib/palette.ts` skip. Run `npx vitest run src/__tests__/palette.test.ts` — it must stay green.

- [ ] **Step 3: Write the guardrail test**

Create `src/__tests__/design-system-guardrails.test.ts`. It must:

- Walk `src/app` and `src/components` (so `src/lib/*` is out of scope), skipping `__tests__`, `isDecorativeTheme(relToSrc)`, and `src/app/globals.css`.
- Define:

```ts
const PATTERNS = {
  literalHex: /#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b/g,
  rgbaLiteral: /\brgba?\((?!\s*var\()/g,
  gradientText: /bg-clip-text|text-transparent/g,
  sideTab: /borderLeft:\s*[`'"]3px solid|border-l-\[3px\]/g,
  springEasing: /0\.34,\s*1\.56,\s*0\.64,\s*1/g,
  aiHue: /(?:from|via|to)-(?:indigo|violet|purple|fuchsia)-\d{3}/g,
  plainImg: /<img\b/g,
} as const;
```

- Read `src/__tests__/fixtures/design-baseline.json`. If a pattern has no number, fail with: `Run UPDATE_BASELINE=1 npx vitest run src/__tests__/design-system-guardrails.test.ts to seed the baseline.`
- Assert `total <= baseline[pattern]`, and on failure include the top five offending files with counts.
- Support `UPDATE_BASELINE=1`: recompute all counts and write the JSON, but **throw if any new count is greater than the existing one**. This makes the ratchet one-way.

- [ ] **Step 4: Seed the baseline**

Run: `UPDATE_BASELINE=1 npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: `src/__tests__/fixtures/design-baseline.json` is created. Counts are **occurrences, not lines**, so expect roughly: `literalHex` ≈ 2,700, `rgbaLiteral` ≈ 2,150, `gradientText` 4, `sideTab` 10, `springEasing` 7, `aiHue` 12, `plainImg` 43. `plainImg` is tracked but not driven to zero in this plan; the image migration owns it.

- [ ] **Step 5: Run it normally to verify it passes**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: PASS.

- [ ] **Step 6: Prove the ratchet bites**

Temporarily set `gradientText` to `3` in the JSON (the seeded count is 4), run the test, confirm it fails naming the `finance/record-payment` offenders, then restore the value to `4` and re-run. Expected: fail, then pass.

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/helpers/token-files.ts src/__tests__/fixtures/design-baseline.json \
  src/__tests__/design-system-guardrails.test.ts src/__tests__/palette.test.ts
git commit -m "test: add a ratcheted design-system guardrail"
```

---

### Task 4: Remove the slop utilities from `globals.css`

**Files:**
- Modify: `src/app/globals.css:1834-1838` (`.card.accent-*`), `1901-1930` (`.page-title`, `.metric-value.gold/.brand`)
- Test: `src/__tests__/design-system-guardrails.test.ts`

**Interfaces:**
- Consumes: the guardrail file from Task 3.
- Produces: `.page-title` renders solid `var(--text-primary)`; no `.card.accent-*` or gradient `.metric-value` rules remain.

- [ ] **Step 1: Write the failing tests**

Add a `describe('globals.css ships no slop utilities')` block to the guardrail test:

```ts
const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

it('has no gradient text', () => {
  expect(css).not.toMatch(/-webkit-text-fill-color:\s*transparent/);
});

it('has no left-accent card utilities', () => {
  expect(css).not.toMatch(/\.card\.accent-/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: both fail.

- [ ] **Step 3: Make `.page-title` solid**

Replace the `.page-title` block and delete its dark variant:

```css
.page-title {
  color: var(--text-primary);
}
```

Delete the `.metric-value.gold` and `.metric-value.brand` blocks. Keep `.metric-value` itself.

- [ ] **Step 4: Delete the accent-card utilities**

Delete the five `.card.accent-*` lines. They have zero call sites (verified by `grep -rn "accent-brand\|accent-gold\|accent-success\|accent-danger\|accent-accent" src`).

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: PASS.

- [ ] **Step 6: Check `PageHeader` in the app**

Running the whole `src/__tests__/` suite is too broad while it settles; instead render-check the component:

```bash
npx vitest run src/__tests__/form-system-guardrails.test.tsx
```
Expected: PASS (it imports `PageHeader`'s sibling UI modules). Then open any page using `PageHeader` in dev and confirm the title is solid, not invisible, in light and dark.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/__tests__/design-system-guardrails.test.ts
git commit -m "fix: remove gradient-title and left-accent utilities"
```

---

### Task 5: Remove spring easing

**Files:**
- Modify: `src/app/globals.css:256,1034,1120,1162,1486`
- Modify: `src/app/(chrome)/engagement/notifications/page.tsx:29`
- Modify: `src/app/(chrome)/engagement/campaigns/page.tsx:67`
- Modify: `src/app/(chrome)/engagement/offers/page.tsx:25`
- Modify: `src/app/(chrome)/engagement/feedback/page.tsx:23`
- Modify: `src/app/(chrome)/engagement/automation/page.tsx:76`
- Modify: `src/app/(chrome)/engagement/whatsapp/page.tsx:30`
- Modify: `src/app/(chrome)/pt-os/balance-sheet/page.tsx:45`
- Test: `src/__tests__/design-system-guardrails.test.ts`

**Interfaces:**
- Consumes: the guardrail from Task 3.
- Produces: no `--ease-spring` token, no spring cubic-bézier in any `.tsx`.

- [ ] **Step 1: Write the failing tests**

Lower `springEasing` to `0` in `design-baseline.json`, and add:

```ts
it('has no spring easing token', () => {
  expect(css).not.toMatch(/--ease-spring/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: the ratchet fails with 7 `.tsx` offenders, and the CSS assertion fails.

- [ ] **Step 3: Replace the CSS uses**

In `globals.css`, replace all four `var(--ease-spring)` uses with `var(--ease-out)`, then delete the `--ease-spring` declaration.

- [ ] **Step 4: Replace the framer-motion curves**

In each of the seven files, change:

```ts
ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number]
```

to:

```ts
ease: [0.4, 0, 0.2, 1] as [number, number, number, number]
```

- [ ] **Step 5: Run to verify it passes**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: PASS.

- [ ] **Step 6: Confirm reduced motion still applies**

Run: `grep -n "prefers-reduced-motion" -A 4 src/app/globals.css`
Expected: the block still exists and is not scoped to the removed token.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css "src/app/(chrome)/engagement" "src/app/(chrome)/pt-os/balance-sheet/page.tsx" \
  src/__tests__/design-system-guardrails.test.ts src/__tests__/fixtures/design-baseline.json
git commit -m "fix: replace spring easing with the standard ease-out curve"
```

---

### Task 6: Remove gradient text and AI-hue gradients

**Files:**
- Modify: `src/app/(chrome)/finance/record-payment/page.tsx:28,169,179,209,344`
- Modify: `src/components/modules/ModuleWorkspace.tsx:59`
- Test: `src/__tests__/design-system-guardrails.test.ts`

**Interfaces:**
- Consumes: the guardrail from Task 3.
- Produces: `gradientText` and `aiHue` both at `0`.

- [ ] **Step 1: Write the failing tests**

Lower `gradientText` and `aiHue` to `0` in `design-baseline.json`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: fails listing the offending files and counts.

- [ ] **Step 3: Replace the gradient text**

In `record-payment/page.tsx`:

- Line 169: replace the `bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent` classes with `text-[var(--success)]`.
- Line 209: replace the conditional gradient-text class `bg-gradient-to-br from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent` with `text-[var(--brand)]`.

- [ ] **Step 4: Replace the AI-hue gradients**

`METHOD_COLORS` and `accentClasses` are interpolated into `bg-gradient-to-r ${…}`, so their values must stay gradient fragments.

- Line 28: `UPI: 'from-violet-500 to-purple-500'` → `UPI: 'from-[var(--brand-hi)] to-[var(--brand)]'`.
- Line 179: the `from-indigo-500/10 via-violet-500/10 to-purple-500/10` background → `bg-[var(--bg-subtle)]`. Also change the two corner-glow radials from `rgba(148,161,249,0.2)` / `rgba(180,157,251,0.2)` to `rgba(0,103,224,0.12)` so the card is not still indigo/violet-tinted.
- Line 344: replace `bg-gradient-to-r from-indigo-500 to-violet-500` with `bg-[var(--brand)]`, and the two indigo-tinted shadows with `shadow-[0_4px_16px_var(--brand-glow)]` and `hover:shadow-[0_8px_24px_var(--brand-glow)]`.
- `ModuleWorkspace.tsx:59`: `purple: 'from-violet-600 to-fuchsia-500'` → `purple: 'from-[var(--brand-hi)] to-[var(--brand)]'`.

- [ ] **Step 5: Run to verify they pass**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(chrome)/finance/record-payment/page.tsx" src/components/modules/ModuleWorkspace.tsx \
  src/__tests__/fixtures/design-baseline.json
git commit -m "fix: remove gradient text and off-palette gradients"
```

---

### Task 7: Remove the side-tab accent stripes

**Files:**
- Modify: `src/app/(chrome)/checkin/dashboard/page.tsx:41`
- Modify: `src/app/(chrome)/settings/profile/page.tsx:293`
- Modify: `src/app/(chrome)/settings/integrations/page.tsx:127,276,388`
- Modify: `src/app/(chrome)/subscription/packages/page.tsx:170`
- Modify: `src/app/(chrome)/help/page.tsx:67`
- Modify: `src/components/modules/WhatsAppCard.tsx:241`
- Modify: `src/components/fitness/ExerciseCard.tsx:94,171`
- Test: `src/__tests__/design-system-guardrails.test.ts`

**Interfaces:**
- Consumes: the guardrail from Task 3.
- Produces: `sideTab` at `0`.

- [ ] **Step 1: Write the failing test**

Lower `sideTab` to `0` in `design-baseline.json`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: fails listing the ten offenders.

- [ ] **Step 3: Delete the stripes**

For each site, delete the `borderLeft: \`3px solid ${…}\`` property. Do **not** replace it with another accent (top stripe, glow, coloured background): the category colour already lives on the icon, value, or badge. Where deleting the left border leaves the element with no border at all, add `border: '1px solid var(--border)'`.

Special cases:

- `help/page.tsx:67` is an accordion row whose stripe indicates the open state. Replace the conditional `borderLeft` with `background: openIdx === i ? 'var(--bg-subtle)' : 'transparent'`.
- `subscription/packages/page.tsx:170` declares `borderTop`, `borderRight`, and `borderBottom` separately. Replace all four with `border: '1px solid var(--border)'`.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/__tests__/design-system-guardrails.test.ts`
Expected: PASS.

- [ ] **Step 5: Check the touched cards still read as distinct**

Open `/checkin/dashboard`, `/settings/integrations`, `/subscription/packages`, and `/help` in dev. Each card must still show its category through the icon, value, or label. If a card now reads flat, give the icon tile the category colour rather than restoring the stripe.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(chrome)/checkin/dashboard/page.tsx" "src/app/(chrome)/settings/profile/page.tsx" \
  "src/app/(chrome)/settings/integrations/page.tsx" "src/app/(chrome)/subscription/packages/page.tsx" \
  "src/app/(chrome)/help/page.tsx" src/components/modules/WhatsAppCard.tsx \
  src/components/fitness/ExerciseCard.tsx src/__tests__/fixtures/design-baseline.json
git commit -m "fix: remove side-tab accent stripes"
```

---

## Close-out verification

- [ ] Run `npx vitest run src/__tests__/palette.test.ts src/__tests__/design-system-guardrails.test.ts`
      Expected: both pass.
- [ ] Run `npm run lint && npm run typecheck`
      Expected: both exit 0.
- [ ] Run the six tests from Task 1 Step 5 again.
      Expected: still pass.
- [ ] Confirm `design-baseline.json` has `gradientText: 0`, `sideTab: 0`, `springEasing: 0`, `aiHue: 0`.
- [ ] Commit any remaining baseline change with the message `chore: close out the design-system guardrail baseline`.
