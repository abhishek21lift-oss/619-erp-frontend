# Custom exercise actions — design

## Intent

Three gaps reported by the trainer:

1. The programme builder can create a missing exercise, but the route is only
   reachable by typing a name that has no exact match. There is no visible
   "New exercise" action on the Add exercises screen.
2. Editing an exercise in the Exercise Library is buried in a hover-only card
   menu, and the detail drawer has no edit action for built-ins.
3. Deleting is only in that same hover menu. On a phone the menu button is
   `opacity-0` until hover, so it is effectively unreachable.

## Goal

- A visible **New exercise** action on Add exercises that returns to the same
  day and auto-attaches the created row through the existing `?new=<id>` path.
- Edit and Delete reachable from the library card menu and the detail drawer.
- Built-in library rows stay read-only for every studio. Their action reads
  **Duplicate & edit**: duplicate through the existing API, then open the
  copy's editor. Archive and Delete stay disabled with a "Built-in exercise"
  hint.

## Non-goals

- No backend, migration or permission change.
- No global edit/delete of built-in rows.
- No per-studio override/hide of built-in rows.
- No change to programme rows, workout history or the delete semantics: the
  existing soft delete keeps plans and logs intact.

## Approach

Option 1 from the design conversation: built-ins are read-only, custom rows
are editable and deletable, and a built-in edit starts from a duplicate.

## Decisions

- **Builder:** add one `New exercise` button in the `PageHero` actions. It
  links to `/pt-os/exercise-library/new?returnTo=<add-exercises?day=N>`.
  The existing typed-name `Create "…"` card is unchanged.
- **Mobile menu:** the card's `…` button is always visible below `sm`; from
  `sm` up it keeps the hover/focus reveal.
- **Built-in edit:** `openEdit` branches on `can_edit === false`. It calls
  `api.exercises.duplicate`, toasts, then routes to the copy's editor.
- **Drawer:** adds Archive/Restore and Delete for rows with `can_edit !== false`.
  Delete keeps the page's existing confirmation and reference-count toast.

## Risks

- Duplicate runs before the editor opens, so cancelling the editor leaves a
  copy in the library. The copy is a normal custom row and can be deleted.
- Archive from the drawer closes the drawer; the list refetches behind it.
- The card menu's mobile visibility is a class change, not a behaviour change.
