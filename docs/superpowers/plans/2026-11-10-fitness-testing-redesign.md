# Fitness Testing — approved visual redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Apple-style shell to the Fitness Testing wizard — numbered path rail, warm→cool chapter accents, two-tier reading cards — without changing fields, validation, calculations or wizard flow.

**Architecture:** Add a `path` variant to the shared `StepperTimeline` (classic stays the default for the other seven wizards), a local `StepCard` shell for fitness-testing screens, and two local reading primitives (`ReadingHero`/`SupportItem`) used by steps 1 and 4. Steps 2, 3, 5, 6 and 7 move into the same card shell but keep their current internal layouts. The page switches `PageHero` to its existing `compact` treatment; no new route, API, field, summary panel or dependency is added.

**Tech Stack:** Next.js App Router (client components), React 19, TypeScript, Tailwind v4 + CSS tokens, framer-motion, lucide-react, Vitest + Testing Library, Playwright.

**Spec:** `619-erp-frontend/design-prototypes/fitness-redesign/NOTES.md` (approved direction, tokens, component rules, limits). Prototype comparison: `design-prototypes/fitness-redesign/preview.html`.

## Global Constraints

- Frontend only (`619-erp-frontend`). No backend, migration, schema, API contract, dependency, commit, push or deploy.
- Fields, labels used by tests, validation ranges, calculations and step order do not change. Copy changes are limited to headings/descriptions in the approved mockups.
- Chapter accents live only in `src/components/pt-os/fitness-testing/fitnessTheme.ts`; `palette.test.ts` must stay green. No new global CSS (`globals.css` has user changes).
- Reuse tokens (`--bg-card`, `--bg-subtle`, `--border`, `--text-primary`, `--text-muted`, `--danger-text`) and existing lucide icons. No new dependency.
- Light-first; every surface must remain readable in dark mode because the app theme can switch.
- Keep the existing action dock (Back / Save Draft / Next) and its behaviour. Do not add the mockup's top-bar Cancel/Save Draft.
- Do not add a sticky summary aside or a “vs last time” delta: the product has no summary data source for these, and adding one would be a new feature. Two-tier cards carry the live values.
- Do not touch unrelated dirty files. Current clean targets: `src/components/pt-os/fitness-testing/**`, `src/components/pt-os/shared/StepperTimeline.tsx`, `src/app/(chrome)/pt-os/assessment/page.tsx`, `e2e/flexibility-protocol.ui.spec.ts`.
- No commits. Each task ends with a checkpoint that runs its tests; the user commits explicitly (RULES §3).
- Verify with the exact commands below. A skipped check is reported `BLOCKED`, never as passed.

## Review Focus

1. **Numeric input**: typing or pasting `12a`, `1.2.3` or `-` into a hero/support field must yield the same clamped text as `FloatInput` does today; no letter may reach `form`.
2. **Blood-pressure validation**: an empty/partial reading must still block Next with the same message and still allow the “not measured” confirmation.
3. **Test switching**: picking a different cardio test must show only that test's fields and must not post recovery HR into a VO₂ test's payload shape.
4. **Rail reachability**: clicking a future node beyond `current + 1` must not change step; done nodes and one-ahead remain navigable.
5. **Mobile width**: seven rail nodes and the two-up support row must fit 320–390 px without horizontal scroll or clipped labels.

Each line gets its test in the owning task; the mobile check is in Task 8.

---

### Task 1: Chapter accents + numbered path rail

**Files:**
- Modify: `src/components/pt-os/fitness-testing/fitnessTheme.ts` (after `stepTones`)
- Modify: `src/components/pt-os/shared/StepperTimeline.tsx`
- Test: `src/__tests__/stepper-path.test.tsx` (create)

**Interfaces:**
- Produces: `chapterAccent: Record<1|2|3|4|5|6|7, string>` and `chapterAccents: readonly string[]` in `fitnessTheme.ts`.
- Produces: `StepperTimeline` prop `variant?: 'classic' | 'path'` (default `'classic'`) and `accents?: readonly string[]` (path only, indexed by step array position). Existing props, reachability (`i <= currentIndex + 1`) and scroll-into-view stay.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/stepper-path.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StepperTimeline from '@/components/pt-os/shared/StepperTimeline';
import { chapterAccents } from '@/components/pt-os/fitness-testing/fitnessTheme';

const STEPS = [
  { id: 1, label: 'Blood pressure' }, { id: 2, label: 'Anthropometric' },
  { id: 3, label: 'Body composition' }, { id: 4, label: 'Cardio' },
  { id: 5, label: 'Strength' }, { id: 6, label: 'Endurance' },
  { id: 7, label: 'Flexibility' },
] as const;

it('pins the warm→cool chapter ramp', () => {
  expect(chapterAccents).toEqual([
    '#a33757', '#d95f7a', '#ff9500', '#30b0c7', '#4a9fe0', '#5856d6', '#34c759',
  ]);
});

it('marks done, active and upcoming nodes', () => {
  render(<StepperTimeline steps={STEPS} current={4} onStep={() => {}} variant="path" accents={chapterAccents} />);
  const active = screen.getByRole('button', { name: 'Cardio' });
  expect(active).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('button', { name: 'Blood pressure' })).toHaveAttribute('aria-disabled', 'false');
  expect(screen.getByRole('button', { name: 'Flexibility' })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('button', { name: 'Strength' })).toHaveAttribute('aria-disabled', 'false');
});

it('only navigates to a reachable node', () => {
  const onStep = vi.fn();
  render(<StepperTimeline steps={STEPS} current={4} onStep={onStep} variant="path" accents={chapterAccents} />);
  fireEvent.click(screen.getByRole('button', { name: 'Endurance' }));
  expect(onStep).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Strength' }));
  expect(onStep).toHaveBeenCalledWith(5);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/stepper-path.test.tsx`
Expected: FAIL — `chapterAccents` is not exported / `aria-disabled` missing.

- [ ] **Step 3: Add the accents and the variant**

In `fitnessTheme.ts`:

```ts
/** One accent per wizard chapter, in order. Decoration only; clinical state
 *  still comes from the five palette families below. */
export const chapterAccent = {
  1: '#a33757', 2: '#d95f7a', 3: '#ff9500', 4: '#30b0c7',
  5: '#4a9fe0', 6: '#5856d6', 7: '#34c759',
} as const;
export const chapterAccents = [
  chapterAccent[1], chapterAccent[2], chapterAccent[3], chapterAccent[4],
  chapterAccent[5], chapterAccent[6], chapterAccent[7],
] as const;
```

In `StepperTimeline.tsx`, extend the props and render a second branch before the current return:

```tsx
variant?: 'classic' | 'path';
accents?: readonly string[];
```

Path rules: cap row `sm:hidden` with `Step {currentIndex + 1} of {steps.length}` and the active label; 7 flex nodes; done nodes are 30 px rose-tinted checks with `aria-disabled="false"`; active is 34 px filled with `accents?.[i]` and `aria-current="step"`; upcoming are white with a number and `aria-disabled="true"` only when unreachable; connectors are 2 px, rose-tinted when the left node is done; labels `hidden sm:block`; desktop labels may wrap to two lines; mobile labels hidden. Keep `aria-label={s.label}` on every button. Do not change the classic branch's existing colours or classes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/stepper-path.test.tsx src/__tests__/page-shell.test.ts`
Expected: PASS — new rail tests green, existing navy-stepper pins unchanged.

- [ ] **Step 5: Checkpoint (no commit)**

Report files changed and the two test results. Stop for review if the rail differs from `preview.html`.

---

### Task 2: Compact page header + `StepCard` shell

**Files:**
- Create: `src/components/pt-os/fitness-testing/StepCard.tsx`
- Modify: `src/app/(chrome)/pt-os/assessment/page.tsx` (the return block around line 676)
- Test: `src/__tests__/fitness-step-card.test.tsx` (create), `src/__tests__/fitness-shell.test.ts` (create)

**Interfaces:**
- Produces: `StepCard({ icon: LucideIcon; accent: string; title: string; description?: string; badge?: string; children: React.ReactNode })`.
- Consumes: `chapterAccents` from Task 1.

- [ ] **Step 1: Write the failing tests**

`fitness-step-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Ruler } from 'lucide-react';
import { StepCard } from '@/components/pt-os/fitness-testing/StepCard';

it('renders the chapter icon, title, badge and children', () => {
  render(<StepCard icon={Ruler} accent="#d95f7a" title="Anthropometric data" description="Body measurements" badge="Step 2 of 7"><p>fields</p></StepCard>);
  expect(screen.getByRole('heading', { name: 'Anthropometric data' })).toBeTruthy();
  expect(screen.getByText('Body measurements')).toBeTruthy();
  expect(screen.getByText('Step 2 of 7')).toBeTruthy();
  expect(screen.getByText('fields')).toBeTruthy();
});
```

`fitness-shell.test.ts` (source pin, like `page-shell.test.ts`):

```ts
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { srcPath } from '@/__tests__/helpers/app-routes';

it('the fitness page uses the compact header and path rail', () => {
  const page = readFileSync(srcPath('app', 'pt-os', 'assessment', 'page.tsx'), 'utf8');
  expect(page).toMatch(/<PageHero[\s\S]{0,160}compact/);
  expect(page).toContain('variant="path"');
  expect(page).toContain('accents={chapterAccents}');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/fitness-step-card.test.tsx src/__tests__/fitness-shell.test.ts`
Expected: FAIL — `StepCard` missing; page still full hero.

- [ ] **Step 3: Implement `StepCard` and switch the page header**

`StepCard` renders one `<section>`: `rounded-[24px] border bg-[var(--bg-card)] p-5 sm:p-7`, `borderColor: 'var(--border)'`; header row with a 40 px icon tile (`background: color-mix(in srgb, accent 12%, transparent)`, `color: accent`), title 18 px/780, description 12.5 px `--text-muted`, optional badge pill on the right; body `mt-5 space-y-4`.

In the assessment page import `chapterAccents` from `fitnessTheme` and change the header to:

```tsx
<PageHero
  compact
  icon={<ClipboardCheck size={18} />}
  title="Fitness Testing"
  subtitle={clientName ? `${clientName} · ${form.assessmentDate}` : undefined}
>
  {!reviewMode && !lastSaved && (
    <StepperTimeline variant="path" accents={chapterAccents} steps={STEPS} current={step} onStep={goToStep} />
  )}
</PageHero>
```

Do not change `PageContainer`, the `max-w-3xl` column, the action dock or the review/saved branches.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/fitness-step-card.test.tsx src/__tests__/fitness-shell.test.ts src/__tests__/page-shell.test.ts`
Expected: PASS.

- [ ] **Step 5: Checkpoint (no commit)**

---

### Task 3: Assessment details + Step 1 two-tier vitals

**Files:**
- Create: `src/components/pt-os/fitness-testing/ReadingHero.tsx`
- Modify: `src/components/pt-os/fitness-testing/AssessmentInfoCard.tsx`
- Modify: `src/components/pt-os/fitness-testing/StepBloodPressure.tsx`
- Test: `src/__tests__/step-blood-pressure.test.tsx` (create), `src/__tests__/assessment-info-card.test.tsx` (create)

**Interfaces:**
- Produces: `ReadingHero({ label, accent, children })`, `ReadingInput({ label, value, onChange, unit?, width? })`, `SupportItem({ label, accent, tag?, children })`, `SupportInput({ label, value, onChange, unit? })`, `StatusChip({ pill, children })`.
- `StatusChip` takes `pill: { bg: string; color: string }` from `fitnessTheme`.

- [ ] **Step 1: Write the failing tests**

`step-blood-pressure.test.tsx`:

```tsx
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import StepBloodPressure from '@/components/pt-os/fitness-testing/StepBloodPressure';
import { initAssessmentForm } from '@/components/pt-os/fitness-testing/types';

function Harness() {
  const [form, setForm] = useState({ ...initAssessmentForm(), bpSystolic: '118', bpDiastolic: '76', restingHeartRate: '62', restingSpo2: '98' });
  return <StepBloodPressure form={form} set={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />;
}

it('keeps the accessible field names and shows the classification inline', () => {
  render(<Harness />);
  expect(screen.getByLabelText('Systolic (mmHg)')).toHaveValue('118');
  expect(screen.getAllByText('Normal').length).toBeGreaterThan(0);
});

it('clamps numeric hero input instead of accepting letters', () => {
  render(<Harness />);
  const systolic = screen.getByLabelText('Systolic (mmHg)');
  fireEvent.change(systolic, { target: { value: '12a0.5' } });
  expect(systolic).toHaveValue('1205');
});

it('toggles the not-measured confirmation as a switch', () => {
  const set = vi.fn();
  render(<StepBloodPressure form={initAssessmentForm()} set={set} />);
  fireEvent.click(screen.getByRole('switch'));
  expect(set).toHaveBeenCalledWith('bpNotMeasured', true);
});

it('renders the step error without hiding the fields', () => {
  render(<StepBloodPressure form={initAssessmentForm()} set={() => {}} error="Enter the resting blood pressure" />);
  expect(screen.getByText('Enter the resting blood pressure')).toBeTruthy();
  expect(screen.getByLabelText('Systolic (mmHg)')).toBeTruthy();
});
```

`assessment-info-card.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import AssessmentInfoCard from '@/components/pt-os/fitness-testing/AssessmentInfoCard';
import { initAssessmentForm } from '@/components/pt-os/fitness-testing/types';

it('shows client and number as read-only text, not disabled inputs', () => {
  render(<AssessmentInfoCard form={initAssessmentForm()} set={() => {}} clientName="Sarah Mitchell" nextAssessmentNumber={7} />);
  expect(screen.getByText('Sarah Mitchell')).toBeTruthy();
  expect(screen.getByText('7')).toBeTruthy();
  expect(screen.queryByLabelText('Client Name')).toBeNull();
  expect(screen.queryByLabelText('Assessment Number')).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/step-blood-pressure.test.tsx src/__tests__/assessment-info-card.test.tsx`
Expected: FAIL — no `ReadingHero`, no switch role, client is a disabled input.

- [ ] **Step 3: Implement the reading primitives and the two cards**

`ReadingHero.tsx`:
- `ReadingInput` uses `useId`, `clampNumericText` imported from `@/components/ui/FloatInput`, `inputMode="numeric"`, `aria-label={label}`, `h-12`, `text-[36px] font-[760] tracking-[-0.045em]`, transparent background, width 78 px (62 px for `narrow`). Focus uses the app's global ring.
- `ReadingHero` is `rounded-[18px] bg-[var(--bg-subtle)] px-4 py-3.5`, label 11.5/600 muted, value row baseline; focus-within ring via `--accent` if needed.
- `SupportItem` is a compact `rounded-[14px] bg-[var(--bg-subtle)] px-3 py-2.5` row; `SupportInput` is a right-aligned 44 px-high transparent input with `clampNumericText`.
- `StatusChip` is a pill with `background: pill.bg`, `color: pill.color`, a 6 px currentColor dot and text. Colour never carries the status alone.

`AssessmentInfoCard`: wrap in `StepCard icon={ClipboardList} accent={chapterAccent[1]} title="Assessment details" badge="Auto-filled"`; replace the two disabled `FloatInput`s with read-only label/value blocks (`Client`, `Assessment number`) at the same 44 px height and 12 px radius. Keep the assessment date, type, testing conditions and notes fields exactly as they are.

`StepBloodPressure`: replace the outer `<div>` and `StepHeader` with `StepCard icon={HeartPulse} accent={chapterAccent[1]} title="Blood Pressure" description="Resting cardiovascular baseline" badge="Step 1 of 7"`. Inside:
- `ReadingHero label="Blood pressure"` with two `ReadingInput`s, `/`, unit `mmHg`, and `StatusChip` for `bpPill(category)`.
- `SupportItem` row (2 columns; single column below 380 px) for resting HR and SpO₂, each with a compact input and `StatusChip` for `rhrPill`/`spo2Pill`.
- Keep the not-measured control, but render it as `role="switch" aria-checked={form.bpNotMeasured}` with a track/knob and the same sentence.
- Keep the error paragraph, stop/caution notices, repeat-BP and athlete notes verbatim.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/step-blood-pressure.test.tsx src/__tests__/assessment-info-card.test.tsx src/__tests__/vitals-classification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Checkpoint (no commit)**

---

### Task 4: Step 4 picker cards + reading hero

**Files:**
- Modify: `src/components/pt-os/fitness-testing/StepCardio.tsx`
- Modify: `e2e/flexibility-protocol.ui.spec.ts` (the `walkToStep7` helper, line ~181)
- Test: `src/__tests__/step-cardio.test.tsx` (create)

**Interfaces:**
- Produces: six `role="radio"` buttons with `aria-label` equal to the `CardioTestType` value, inside `role="radiogroup" aria-label="Cardiorespiratory test"`.
- Consumes: `ReadingHero`, `ReadingInput`, `StatusChip` from Task 3; `chapterAccent[4]`.

- [ ] **Step 1: Write the failing test**

```tsx
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it } from 'vitest';
import StepCardio from '@/components/pt-os/fitness-testing/StepCardio';
import { initAssessmentForm } from '@/components/pt-os/fitness-testing/types';

function Harness() {
  const [form, setForm] = useState(initAssessmentForm());
  return <StepCardio form={form} set={(k, v) => setForm((f) => ({ ...f, [k]: v }))} age={34} gender="Female" />;
}

it('renders six test cards and selects one', () => {
  render(<Harness />);
  expect(screen.getAllByRole('radio')).toHaveLength(6);
  fireEvent.click(screen.getByRole('radio', { name: 'YMCA 3-Minute Step Test' }));
  expect(screen.getByRole('radio', { name: 'YMCA 3-Minute Step Test' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByLabelText('Recovery Heart Rate (bpm)')).toBeTruthy();
});

it('swaps the fields and the result when the test changes', () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole('radio', { name: 'Rockport 1-Mile Walk' }));
  expect(screen.getByLabelText('Heart Rate at Finish (bpm)')).toBeTruthy();
  expect(screen.queryByLabelText('Recovery Heart Rate (bpm)')).toBeNull();
  fireEvent.change(screen.getByLabelText('Completion Time (min)'), { target: { value: '14.5' } });
  expect(screen.getByLabelText('Completion Time (min)')).toHaveValue('14.5');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/step-cardio.test.tsx`
Expected: FAIL — only a `Test` searchable select exists.

- [ ] **Step 3: Implement the picker and result card**

- Keep `CARDIO_TESTS` and every `calcVo2Max*`/classification call unchanged.
- Add `CARDIO_META: Record<CardioTestType, { icon: LucideIcon; hint: string; protocol: string }>` with the mockup's hints: YMCA `12 in step · recovery pulse`, Rockport `1 mile · time + finish HR`, Cooper `12 min · distance covered`, Bruce `Treadmill · total time`, Harvard `20 in step · 3 recovery pulses`, Custom `Free-form protocol + notes`. Icons: `Footprints`, `Footprints`, `Timer`, `Mountain`, `Footprints`, `SlidersHorizontal`.
- Picker card: `StepCard icon={HeartPulse} accent={chapterAccent[4]} title="Choose a test" description="One cardio test per assessment" badge="Step 4 of 7"`, with a two-column (one on mobile) grid. Each card: neutral icon tile, title, hint, radio circle; selected card gets teal border, 5% tint, 3 px ring, filled radio. Use `bg-[var(--bg-card)]` / `bg-[var(--bg-subtle)]` and `chapterAccent[4]` for the selected state.
- Result card (only when a test is chosen): `StepCard accent={chapterAccent[4]} title={form.cardioTestType} description={CARDIO_META[test].protocol} badge="Selected"`.
- Keep the conditional fields exactly as they are today, but lay them out in the result card (`grid gap-4 sm:grid-cols-2`) with `FloatInput`.
- Hero:
  - YMCA: `ReadingHero label="Recovery heart rate"` with a `ReadingInput` bound to `cardioRecoveryHr`, unit `bpm`, `StatusChip` for `categoryPill(category)`.
  - Rockport/Cooper/Bruce: compact fields first, then `ReadingHero label="Estimated VO₂ max"` with the read-only `preview.vo2` value, unit `mL/kg/min`, chip for `category`.
  - Harvard: compact fields, then `ReadingHero label="Harvard PEI"` with `preview.pei` (one decimal), chip for `category`.
  - Custom: notes field only, no hero.
  - Keep the YMCA “No standard VO₂max formula” note and the protocol sentences.
- Error paragraph stays below the picker.
- Update `walkToStep7` in `e2e/flexibility-protocol.ui.spec.ts`:

```ts
await page.getByRole('radio', { name: 'YMCA 3-Minute Step Test' }).click();
```

Remove only the now-unused `pick(page, 'Test', 0, ...)` call for step 4; leave the step 5/6 `pick` calls.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/step-cardio.test.tsx src/__tests__/cardio-calculations.test.ts src/__tests__/anthropometric-classification.test.tsx`
Expected: PASS.

- [ ] **Step 5: Checkpoint (no commit)**

Note for the reviewer: the Playwright flow is the real picker regression; it runs in Task 8.

---

### Task 5: Steps 2 and 3 into the card shell

**Files:**
- Modify: `src/components/pt-os/fitness-testing/StepAnthropometric.tsx`
- Modify: `src/components/pt-os/fitness-testing/StepBodyComposition.tsx`
- Test: `src/__tests__/fitness-step-shells.test.ts` (create)

**Interfaces:**
- Consumes: `StepCard`, `chapterAccent`.

- [ ] **Step 1: Write the failing source test**

```ts
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { srcPath } from '@/__tests__/helpers/app-routes';

const FILES = ['StepAnthropometric', 'StepBodyComposition', 'StepStrength', 'StepEndurance', 'StepFlexibility'];

it.each(FILES)('%s uses the fitness card shell, not its own header', (name) => {
  const src = readFileSync(srcPath('components', 'pt-os', 'fitness-testing', `${name}.tsx`), 'utf8');
  expect(src).toContain('StepCard');
  expect(src).not.toContain('<StepHeader');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/fitness-step-shells.test.ts`
Expected: FAIL for steps 2/3/5/6/7.

- [ ] **Step 3: Wrap steps 2 and 3**

- `StepAnthropometric`: outer `StepCard icon={Ruler} accent={chapterAccent[2]} title="Anthropometric data" description="Body measurements" badge="Step 2 of 7"`. Keep the existing two field panels, limbs panel, sex-specific notice, error and classification summary untouched.
- `StepBodyComposition`: outer `StepCard icon={Activity} accent={chapterAccent[3]} title="Body Composition" description="Choose an assessment method" badge="Step 3 of 7"`. Keep the method select, all fields, warning, error and summary untouched.
- Remove the `StepHeader` imports/usages from both.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/fitness-step-shells.test.ts src/__tests__/anthropometric-classification.test.tsx`
Expected: PASS (the shell test still fails for 5/6/7 until Tasks 6–7; run only the two files for 2/3 in this task by checking `StepAnthropometric`/`StepBodyComposition` names, or keep the table and accept those two still red — do not report the file green).

- [ ] **Step 5: Checkpoint (no commit)**

---

### Task 6: Steps 5 and 6 into the card shell

**Files:**
- Modify: `src/components/pt-os/fitness-testing/StepStrength.tsx`
- Modify: `src/components/pt-os/fitness-testing/StepEndurance.tsx`
- Test: `src/__tests__/fitness-step-shells.test.ts` (from Task 5)

**Interfaces:**
- Consumes: `StepCard`, `chapterAccent`.

- [ ] **Step 1: Confirm the shell test still fails for these two**

Run: `npx vitest run src/__tests__/fitness-step-shells.test.ts`
Expected: FAIL on `StepStrength` and `StepEndurance`.

- [ ] **Step 2: Wrap steps 5 and 6**

- `StepStrength`: `StepCard icon={Dumbbell} accent={chapterAccent[5]} title="Muscular Strength" description={isBeginner ? 'Optional — two one-rep max tests' : 'Two one-rep max tests'} badge="Step 5 of 7"`. Keep both `StrengthTestBlock`s, the beginner notice, formula/mode controls, error and combined score untouched.
- `StepEndurance`: `StepCard icon={Repeat} accent={chapterAccent[6]} title="Muscular Endurance" description="Two sustained-effort tests" badge="Step 6 of 7"`. Keep both blocks, error and combined score untouched.
- Remove `StepHeader` imports/usages.

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/fitness-step-shells.test.ts`
Expected: only `StepFlexibility` still failing.

- [ ] **Step 4: Checkpoint (no commit)**

---

### Task 7: Step 7 into the card shell

**Files:**
- Modify: `src/components/pt-os/fitness-testing/StepFlexibility.tsx`
- Test: `src/__tests__/fitness-step-shells.test.ts`

**Interfaces:**
- Consumes: `StepCard`, `chapterAccent`.

- [ ] **Step 1: Confirm the last shell failure**

Run: `npx vitest run src/__tests__/fitness-step-shells.test.ts`
Expected: FAIL on `StepFlexibility`.

- [ ] **Step 2: Wrap both Step 7 branches**

- Legacy branch: `StepCard icon={Move} accent={chapterAccent[7]} title="Flexibility & Mobility" description="Recorded with the earlier two-test workflow" badge="Step 7 of 7"` around the read-only block.
- Main branch: same card, `description="The K11 five-test battery"`. Keep the overview/summary/TestScreen state machine and every test row untouched.

Removing the outer `StepHeader` must not move `TestScreen` or `FlexibilitySummary` out of the card, and the internal `view` transitions keep working.

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/fitness-step-shells.test.ts`
Expected: PASS.

- [ ] **Step 4: Checkpoint (no commit)**

---

### Task 8: Visual pass, regression gates, evidence

**Files:**
- No product files unless the visual pass finds a defect; fix it in the owning file above.
- Evidence: `test-results/fitness-redesign/` (screenshots, not committed unless requested).

**Interfaces:**
- Consumes all prior tasks.

- [ ] **Step 1: Start the local stack**

Run: `npm run dev` (frontend), ensure the local backend is on `:5000`; use the seeded client `ptc-e2e-alpha` and `owner-a@e2e.test` / `E2ePassw0rd!seed`. No production access.

- [ ] **Step 2: Capture the four required views**

At `/pt-os/assessment?client_id=ptc-e2e-alpha`:
- Step 1 at 1440×1200 and 390×844.
- Step 4 at 1440×1080 and 390×844, with YMCA selected and a recovery value entered.

Save to `test-results/fitness-redesign/{step1,step4}-{desktop,mobile}.png`. Check: rail alignment, active accent, check marks, no horizontal overflow (`scrollWidth <= innerWidth`), hero number fits, support row two-up at 390, picker radios aligned, focus ring visible on Tab.

- [ ] **Step 3: Fix visual defects in the owning file only**

Do not adjust spacing by editing `globals.css`. If a card/rail value needs a shared change, change `StepCard`/`StepperTimeline`, not the page.

- [ ] **Step 4: Run the targeted regression set**

Run:

```bash
npx vitest run \
  src/__tests__/stepper-path.test.tsx \
  src/__tests__/fitness-step-card.test.tsx \
  src/__tests__/fitness-shell.test.ts \
  src/__tests__/step-blood-pressure.test.tsx \
  src/__tests__/assessment-info-card.test.tsx \
  src/__tests__/step-cardio.test.tsx \
  src/__tests__/fitness-step-shells.test.ts \
  src/__tests__/page-shell.test.ts \
  src/__tests__/assessment-stepper-guards.test.ts \
  src/__tests__/palette.test.ts \
  src/__tests__/form-system-guardrails.test.tsx \
  src/__tests__/float-input-numeric.test.tsx \
  src/__tests__/anthropometric-classification.test.tsx \
  src/__tests__/cardio-calculations.test.ts
```

Expected: all PASS.

- [ ] **Step 5: Typecheck and lint the changed files**

Run: `npm run typecheck`
Then: `npx eslint src/components/pt-os/fitness-testing src/components/pt-os/shared/StepperTimeline.tsx 'src/app/(chrome)/pt-os/assessment/page.tsx' src/__tests__/stepper-path.test.tsx src/__tests__/fitness-step-card.test.tsx src/__tests__/fitness-shell.test.ts src/__tests__/step-blood-pressure.test.tsx src/__tests__/assessment-info-card.test.tsx src/__tests__/step-cardio.test.tsx src/__tests__/fitness-step-shells.test.ts`
Expected: no errors; pre-existing warnings reported as-is.

- [ ] **Step 6: Run the Playwright flow that reaches Step 4 and Step 7**

Run: `npx playwright test e2e/flexibility-protocol.ui.spec.ts`
Expected: PASS. If auth/dev/API is unavailable, report `BLOCKED` with the exact failure and do not claim the picker regression passed.

- [ ] **Step 7: Checkpoint and report**

Report: result, files, unit/typecheck/lint/e2e status, screenshot paths, any `BLOCKED` check, and the scope decisions (no summary aside, no last-time delta, no commits). Update `TRACKER.md` with a dated entry only if the user asks for implementation tracking; do not mark the redesign complete on a partial gate.

## Self-Review

- **Spec coverage:** rail (Task 1), compact header + card shell (2), two-tier step 1 (3), picker + two-tier step 4 (4), remaining steps in cards (5–7), visual + accessibility/regression gates (8). The deferred items are named in Global Constraints.
- **Step scan:** every step either writes a test, runs a test, or makes one named change. No “handle edge cases” placeholders; the five review-focus behaviours have owning tests.
- **Type consistency:** `chapterAccent`/`chapterAccents` names match across tasks; `StepCard` props match all callers; `ReadingInput`/`SupportItem` signatures match tasks 3 and 4; `variant`/`accents` match the page and tests.
- **Review focus:** numeric clamp (Task 3), BP validation (Task 3 error test + existing wizard), test switching (Task 4), rail reachability (Task 1), mobile width (Task 8 visual).
- **Proportion:** the plan leans on existing components and tokens; steps 2/3/5/6/7 are shell-only to avoid rewriting clinical forms that were never visually approved.
