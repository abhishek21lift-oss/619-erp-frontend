# Custom exercise actions — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make custom exercise creation visible in the programme builder, and make edit/delete reachable in the Exercise Library while keeping built-in rows read-only.

**Architecture:** Frontend-only. The builder reuses the existing `exercise-library/new` return path. The library branches edit on `can_edit`: custom rows open the editor, built-ins duplicate first through the existing endpoint. The detail drawer gets the same archive/delete actions as the card menu.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-30-custom-exercise-actions-design.md`

## Global Constraints

- No backend or database changes.
- Built-in rows (`can_edit === false`) are never edited, archived or deleted in place.
- Delete remains the existing soft delete; never a hard delete.
- Reuse `var(--brand)` for the new primary action; no new palette values.
- Keep the existing `?new=<id>` auto-attach contract.

## Review Focus

- A built-in's `Edit` must duplicate and open the copy, never open the built-in editor.
- A custom row's `Edit` must open the editor directly, with no duplicate.
- The card `…` button must be tappable on a phone (no hover needed).
- A failed duplicate must toast and stay put, not navigate.
- Deleting from the drawer must keep the confirmation; cancelling leaves the drawer open.

---

### Task 1: Builder — visible New exercise action

**Files:**
- Modify: `src/components/pt-os/builder/AddExercisesScreen.tsx`
- Test: `src/__tests__/add-exercises-page.test.tsx`

**Interfaces:**
- Produces: `openNewExercise(): void` internal callback.
- Consumes: existing `pathname`, `day`, `router`, `encodeURIComponent`.

- [ ] **Step 1: Write the failing test**

Add to `add-exercises-page.test.tsx`:

```tsx
it('offers a visible new-exercise path back to this day', async () => {
  await renderPage();
  fireEvent.click(screen.getByRole('button', { name: /new exercise/i }));
  expect(push).toHaveBeenCalledWith(
    '/pt-os/exercise-library/new?returnTo=' +
      encodeURIComponent('/pt-os/workout-plans/p1/builder/add-exercises?day=4'),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ./node_modules/vitest/vitest.mjs run src/__tests__/add-exercises-page.test.tsx`
Expected: FAIL — no button named "New exercise".

- [ ] **Step 3: Implement**

In `AddExercisesScreen.tsx`:

- Import `Plus` from `lucide-react`.
- Add:

```tsx
const openNewExercise = useCallback(() => {
  const returnTo = `${pathname}?day=${day}`;
  router.push(`/pt-os/exercise-library/new?returnTo=${encodeURIComponent(returnTo)}`);
}, [router, pathname, day]);
```

- Replace the `PageHero` `actions` with a flex group containing a primary
  `New exercise` button (brand fill, white label, `Plus`) and the existing
  `Back to builder` button.

- [ ] **Step 4: Run test to verify it passes**

Run: `node ./node_modules/vitest/vitest.mjs run src/__tests__/add-exercises-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/pt-os/builder/AddExercisesScreen.tsx src/__tests__/add-exercises-page.test.tsx
git commit -m "feat(builder): a visible new-exercise action on add exercises"
```

---

### Task 2: Library — built-in duplicate & edit, mobile menu, drawer actions

**Files:**
- Modify: `src/components/pt-os/exercise-library/ExerciseCard.tsx`
- Modify: `src/components/pt-os/exercise-library/ExerciseDetailDrawer.tsx`
- Modify: `src/app/(chrome)/pt-os/exercise-library/page.tsx`
- Test: `src/__tests__/exercise-card-actions.test.tsx` (new)

**Interfaces:**
- `ExerciseDetailDrawer` gains required props:
  - `onArchive: (ex: LibraryExercise) => void`
  - `onDelete: (ex: LibraryExercise) => void`
- `openEdit` in the page becomes `(ex: LibraryExercise) => Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/exercise-card-actions.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ExerciseCard } from '@/components/pt-os/exercise-library/ExerciseCard';
import type { LibraryExercise } from '@/lib/api';

const ex = (over: Partial<LibraryExercise> = {}): LibraryExercise => ({
  id: 'ex-1', name: 'Barbell Squat', muscle_group: 'legs', body_part: null,
  target_muscle: null, secondary_muscles: null, equipment: null, difficulty: 'beginner',
  instructions: null, gif_url: null, exercise_type: null, force: null, mechanic: null,
  sets_default: null, reps_default: null, rest_seconds: null, source_id: null,
  ...over,
});

describe('library exercise actions', () => {
  it('offers a built-in as duplicate-and-edit, not a disabled Edit', () => {
    const onEdit = vi.fn();
    render(<ExerciseCard exercise={ex({ can_edit: false })} onOpen={vi.fn()} onToggleFavorite={vi.fn()} onEdit={onEdit} />);
    fireEvent.click(screen.getByRole('button', { name: /exercise actions/i }));
    const item = screen.getByRole('menuitem', { name: /duplicate & edit/i });
    expect(item).toBeEnabled();
    fireEvent.click(item);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('keeps Edit and Delete for a custom exercise', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<ExerciseCard exercise={ex({ can_edit: true, is_custom: true })} onOpen={vi.fn()} onToggleFavorite={vi.fn()} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: /exercise actions/i }));
    expect(screen.getByRole('menuitem', { name: /^edit$/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node ./node_modules/vitest/vitest.mjs run src/__tests__/exercise-card-actions.test.tsx`
Expected: FAIL — built-in menu still says "Edit" and is disabled.

- [ ] **Step 3: Implement**

`ExerciseCard.tsx`:
- Always-render the edit menu item:
  `label={canEdit ? 'Edit' : 'Duplicate & edit'}`, no `disabled`, no hint.
- Keep Archive and Delete disabled for built-ins, both with
  `hint={canEdit ? undefined : 'Built-in exercise'}`.
- Change the `…` button class so it is visible below `sm`:
  `opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100`.

`ExerciseDetailDrawer.tsx`:
- Import `Archive`, `ArchiveRestore`, `Trash2`.
- Add `onArchive` and `onDelete` props and destructure them.
- Always render Edit, labelled `Duplicate & edit` when `ex.can_edit === false`.
- For `ex.can_edit !== false`, render Archive/Restore and Delete icon buttons.

`(chrome)/pt-os/exercise-library/page.tsx`:
- Make `openEdit` async:

```tsx
const openEdit = useCallback(async (ex: LibraryExercise) => {
  if (ex.can_edit !== false) {
    router.push(`/pt-os/exercise-library/${ex.id}/edit`);
    return;
  }
  try {
    const res = await api.exercises.duplicate(ex.id);
    toast.success(`Created "${res.exercise.name}" — editing the copy`);
    router.push(`/pt-os/exercise-library/${res.exercise.id}/edit`);
  } catch (err) {
    toast.error(errorMessage(err, 'Could not duplicate exercise'));
  }
}, [router, toast]);
```

- Pass drawer props:
  - `onArchive={async (ex) => { await handleArchive(ex); setDetailId(null); }}`
  - `onDelete={handleDelete}`

- [ ] **Step 4: Run tests to verify they pass**

Run: `node ./node_modules/vitest/vitest.mjs run src/__tests__/exercise-card-actions.test.tsx src/__tests__/add-exercises-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(chrome)/pt-os/exercise-library/page.tsx" src/components/pt-os/exercise-library/ExerciseCard.tsx src/components/pt-os/exercise-library/ExerciseDetailDrawer.tsx src/__tests__/exercise-card-actions.test.tsx
git commit -m "feat(library): duplicate-and-edit built-ins, and reachable edit/delete"
```

---

### Task 3: Gates

- [ ] **Step 1:** `npx tsc --noEmit`
- [ ] **Step 2:** `npx eslint src/components/pt-os/builder/AddExercisesScreen.tsx "src/app/(chrome)/pt-os/exercise-library/page.tsx" src/components/pt-os/exercise-library/ExerciseCard.tsx src/components/pt-os/exercise-library/ExerciseDetailDrawer.tsx src/__tests__/exercise-card-actions.test.tsx src/__tests__/add-exercises-page.test.tsx`
- [ ] **Step 3:** Run the affected suites again with `--maxWorkers=2`.
- [ ] **Step 4:** Commit the plan/spec docs and push the branch.
