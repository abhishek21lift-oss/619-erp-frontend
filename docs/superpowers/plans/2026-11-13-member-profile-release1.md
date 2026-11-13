# Member Profile Release 1 "Impress" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the member profile feel native and polished: collapsing header, scroll-linked hero, count-up stats, a working Light/Dark switch, shimmer skeletons, and consistent press/haptic feedback.

**Architecture:** Frontend-only. Motion lives inside `/member/more` using framer-motion's `useScroll`/`useTransform` with a `useReducedMotion` fallback. Shared member primitives stay in `MemberUI.tsx`. Theme uses the existing `ThemeProvider`; no pre-paint or shared-theme changes.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind utilities, framer-motion, lucide-react, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-13-member-profile-release1-design.md`

## Global Constraints

- No backend, API, auth, or dependency changes.
- Motion ease `[0.16, 1, 0.3, 1]`; `useReducedMotion() ?? false` must yield a static, fully readable result.
- Sticky header pays `env(safe-area-inset-top, 0px)` itself; MemberShell keeps owning page padding.
- `memberTheme.ts` stays decorative; status colours stay in the palette.
- Minimum 44px touch targets; single `<h1>` per page.
- Commit only if the user explicitly approves; stage only the files named in the task, never `git add -A` (the workspace has unrelated uncommitted changes).
- Reuse: `components/ui/Skeleton`, `triggerHaptic`, `useTheme` from `components/ThemeProvider`.

## Review Focus

1. Notched/TWA device: header content under the status bar, or a double top gap after the header pins.
2. Reduced motion: invisible title or a transformed hero that shifts layout.
3. Dark theme: header/background or the Appearance control losing contrast.
4. Count-up: stats stuck at 0/NaN; a failed achievements read must show "—", never 0.
5. Profile load error: heading and retry remain visible and the sticky header does not trap focus/overlap.

Each of these has a test in its owning task except 1 and 3, which are device/visual and verified manually in Task 5.

---

### Task 1: Shared CountUp

**Files:**
- Create: `src/__tests__/member-count-up.test.tsx`
- Modify: `src/components/member/MemberUI.tsx`
- Modify: `src/components/member/RecapStory.tsx` (remove local `CountUp`, lines ~155-164)

**Interfaces:**
- Produces: `export function CountUp({ to, decimals = 0 }: { to: number; decimals?: number }): React.ReactElement` from `@/components/member/MemberUI`.
- Consumes (Task 3): same import in `more/page.tsx`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/member-count-up.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));

import { CountUp } from '@/components/member/MemberUI';

describe('CountUp', () => {
  it('renders the final value immediately under reduced motion', () => {
    render(<CountUp to={1234} />);
    expect(screen.getByText('1,234')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/member-count-up.test.tsx`
Expected: FAIL — `CountUp` is not exported from `MemberUI`.

- [ ] **Step 3: Move the component**

Move the existing `CountUp` body from `RecapStory.tsx` into `MemberUI.tsx` unchanged (`useState`, `useReducedMotion`, `animate(0, to, { duration: 1.1, ease: EASE, onUpdate: setV })`, `toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })`). Export it. In `RecapStory.tsx`, import `CountUp` from `./MemberUI` and delete the local copy and now-unused imports only if nothing else uses them (`animate` may still be used elsewhere — keep it if so).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/member-count-up.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit (only if approved)**

```bash
git add src/components/member/MemberUI.tsx src/components/member/RecapStory.tsx src/__tests__/member-count-up.test.tsx
git commit -m "refactor(member): share CountUp between recap and profile"
```

---

### Task 2: Appearance control

**Files:**
- Create: `src/components/member/AppearanceCard.tsx`
- Create: `src/__tests__/member-appearance.test.tsx`
- Modify: `src/app/(bare)/member/account/page.tsx` (import and render after `<ContactForm … />`)

**Interfaces:**
- Produces: `export default function AppearanceCard(): React.ReactElement`, no props. Renders a `Section` titled "Appearance" with two `aria-pressed` buttons named exactly `Light` and `Dark`.
- Consumes: `useTheme()` → `{ theme: 'light' | 'dark'; setTheme(t: 'light' | 'dark'): void }`; `Section`, `Card`, `MC` from `./MemberUI`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/__tests__/member-appearance.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const themeMock = vi.hoisted(() => ({ setTheme: vi.fn() }));
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggle: vi.fn(), setTheme: themeMock.setTheme }),
}));

import AppearanceCard from '@/components/member/AppearanceCard';

describe('AppearanceCard', () => {
  it('marks the active theme and switches to dark', () => {
    render(<AppearanceCard />);
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(themeMock.setTheme).toHaveBeenCalledWith('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/member-appearance.test.tsx`
Expected: FAIL — module `@/components/member/AppearanceCard` not found.

- [ ] **Step 3: Implement the component**

```tsx
'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { Card, MC, Section } from './MemberUI';

export default function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ] as const;
  return (
    <Section title="Appearance">
      <Card className="p-3">
        <div role="group" aria-label="Theme" className="grid grid-cols-2 gap-2">
          {options.map(({ value, label, Icon }) => {
            const active = theme === value;
            return (
              <button key={value} type="button" aria-pressed={active}
                onClick={() => setTheme(value)}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] text-[13px] font-[750] transition-colors active:scale-[0.98]"
                style={{ background: active ? MC.primary : 'var(--bg-subtle)', color: active ? '#fff' : MC.ink }}>
                <Icon size={16} aria-hidden /> {label}
              </button>
            );
          })}
        </div>
      </Card>
    </Section>
  );
}
```

Render `<AppearanceCard />` in `AccountBody` immediately after `<ContactForm profile={profile} … />`. Persistence is already handled by `ThemeProvider` + `public/theme-init.js`; do not touch either.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/member-appearance.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit (only if approved)**

```bash
git add src/components/member/AppearanceCard.tsx src/__tests__/member-appearance.test.tsx "src/app/(bare)/member/account/page.tsx"
git commit -m "feat(member): add light/dark appearance control to account"
```

---

### Task 3: Collapsing profile header and hero depth

**Files:**
- Modify: `src/app/(bare)/member/more/page.tsx`
- Modify: `src/__tests__/member-more-page.test.tsx`

**Interfaces:**
- Consumes: `CountUp` from Task 1 (used inside `HeroStat`).
- Produces: page keeps exactly one `<h1>` named "Profile", present in loading and error states.

- [ ] **Step 1: Extend the test file with the reduced-motion mock and achievements mock**

At the top of `src/__tests__/member-more-page.test.tsx`:

```tsx
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));
```

Add `achievements: vi.fn()` to `apiMocks` and wire `achievements: (...a: unknown[]) => apiMocks.achievements(...a)` in the `@/lib/api` mock. In `beforeEach`, reset and resolve it to the current value: `{ data: { totals: { sessions: 12, prs: 3 }, training: { current: 2 } } }`.

Add tests:

```tsx
describe('<MemberMorePage /> heading and stats', () => {
  it('keeps the Profile heading when the profile read fails', async () => {
    apiMocks.profile.mockRejectedValueOnce(new Error('offline'));
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('shows final stat values under reduced motion', async () => {
    renderPage();
    const hero = await screen.findByRole('region', { name: 'Your profile' });
    expect(await within(hero).findByText('12')).toBeTruthy();
    expect(within(hero).getByText('3')).toBeTruthy();
  });

  it('shows a dash, never zero, when achievements fail to load', async () => {
    apiMocks.achievements.mockResolvedValue({ data: { totals: {}, training: {} } });
    renderPage();
    const hero = await screen.findByRole('region', { name: 'Your profile' });
    expect(within(hero).getAllByText('—')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: FAIL — no level-1 heading "Profile"; counters start at 0.

- [ ] **Step 3: Implement the header and motion**

Add `useScroll`, `useTransform`, `useReducedMotion` to the existing `framer-motion` import. In `ProfileBody`, immediately after the existing `useEffect` and **before** any early return, add:

```tsx
const { scrollY } = useScroll();
const reduce = useReducedMotion() ?? false;
const reveal = useTransform(scrollY, [0, 72], [0, 1]);
const titleY = useTransform(scrollY, [0, 72], [6, 0]);
const heroScale = useTransform(scrollY, [0, 160], [1, 0.97]);
const heroY = useTransform(scrollY, [0, 160], [0, 6]);
```

Replace the existing `<h1 className="sr-only">Profile</h1>` with a sticky header rendered before the failed/hero branch:

```tsx
<header className="sticky top-0 z-30 -mx-4 px-4" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
  <span aria-hidden className="pointer-events-none absolute inset-0 backdrop-blur-md"
    style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border)', opacity: reduce ? 1 : reveal }} />
  <div className="relative flex h-11 items-center">
    <m.h1 className="text-[17px] font-[800]" style={{ color: MC.ink, opacity: reduce ? 1 : reveal, y: reduce ? 0 : titleY }}>Profile</m.h1>
  </div>
</header>
```

Wrap `<ProfileHero … />` in:

```tsx
<m.div className="origin-top" style={reduce ? undefined : { scale: heroScale, y: heroY }}>
  <ProfileHero … />
</m.div>
```

Use `CountUp` inside `HeroStat`: keep the existing `value == null ? '—' : value.toLocaleString('en-IN')` branch, but replace the numeric side with `<CountUp to={value} />`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: PASS (all existing + 3 new tests).

- [ ] **Step 5: Commit (only if approved)**

```bash
git add "src/app/(bare)/member/more/page.tsx" src/__tests__/member-more-page.test.tsx
git commit -m "feat(member): add collapsing profile header and count-up stats"
```

---

### Task 4: Shimmer, press states, success haptics

**Files:**
- Modify: `src/components/member/MemberUI.tsx` (`PageSkeleton`, `SubmitButton`)
- Modify: `src/app/(bare)/member/more/page.tsx` (photo save haptic, sign-out press)
- Modify: `src/app/(bare)/member/account/page.tsx` (photo + password haptics, press states)
- Modify: `src/__tests__/member-more-page.test.tsx` (haptic assertion)

**Interfaces:**
- Consumes: `triggerHaptic(pattern: number | number[]): void` from `@/components/common/PullToRefresh/utils`; `Skeleton` from `@/components/ui/Skeleton`.

- [ ] **Step 1: Write the failing test**

Add to the photo flow test (or a new test in the same describe):

```tsx
const hapticMock = vi.hoisted(() => ({ triggerHaptic: vi.fn() }));
vi.mock('@/components/common/PullToRefresh/utils', () => ({ triggerHaptic: hapticMock.triggerHaptic }));
```

Then assert after `Photo updated`:

```tsx
expect(hapticMock.triggerHaptic).toHaveBeenCalledWith(8);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: FAIL — `triggerHaptic` not called.

- [ ] **Step 3: Implement the polish**

- `PageSkeleton`: replace its `animate-pulse` divs with `Skeleton` from `@/components/ui/Skeleton`, keeping the same sizes/radii (`className="rounded-[14px]"`, `rounded-[16px]"`).
- `SubmitButton`: append `active:scale-[0.98]` to the className.
- Sign-out buttons (both pages) and photo buttons (both pages): append `active:scale-[0.98]` where missing.
- After a successful photo save in `/member/more` and `/member/account`, call `triggerHaptic(8)` before `toast.success`.
- In `PasswordForm`'s `onSuccess`, call `triggerHaptic(8)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/member-more-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit (only if approved)**

```bash
git add src/components/member/MemberUI.tsx "src/app/(bare)/member/more/page.tsx" "src/app/(bare)/member/account/page.tsx" src/__tests__/member-more-page.test.tsx
git commit -m "feat(member): polish skeletons, press states and success haptics"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run the targeted suites**

Run: `npx vitest run src/__tests__/member-count-up.test.tsx src/__tests__/member-appearance.test.tsx src/__tests__/member-more-page.test.tsx`
Expected: PASS, summary lists 0 failures.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0, no errors.

- [ ] **Step 3: Lint the changed files**

Run: `npx eslint "src/app/(bare)/member/more/page.tsx" "src/app/(bare)/member/account/page.tsx" src/components/member/MemberUI.tsx src/components/member/RecapStory.tsx src/components/member/AppearanceCard.tsx src/__tests__/member-count-up.test.tsx src/__tests__/member-appearance.test.tsx src/__tests__/member-more-page.test.tsx`
Expected: exit 0.

- [ ] **Step 4: Manual device check**

With `npm run dev` at 390px width:
1. Profile: header transparent at top; after ~72px scroll the blurred bar and "Profile" title appear; hero shrinks slightly; no jump.
2. TWA/notched emulation: when pinned, the bar background covers the status bar and content starts below it.
3. Emulate `prefers-reduced-motion: reduce`: no scroll transforms, title readable, stats at final values.
4. Account: switch Dark then Light; reload and confirm the choice persists before paint.
5. Dark mode: profile header/backdrop and Appearance buttons remain legible.
6. Achievements failure (network block): stats show "—", not 0.

Report PASS/FAIL per item. Do not claim success without running the commands above.
